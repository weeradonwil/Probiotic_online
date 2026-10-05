const express = require('express');
const { randomBytes, createHash } = require('node:crypto');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const mailer = require('../services/mailer');
const { validatePassword } = require('../utils/passwordPolicy');

const router = express.Router();
const TOKEN_RE = /^[a-f0-9]{64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_LINK = 'ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว กรุณาขอลิงก์ใหม่';
const REQUEST_MESSAGE = 'หากอีเมลนี้ลงทะเบียนไว้ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ กรุณาตรวจกล่องขาเข้าและจดหมายขยะ';
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'ขอลิงก์บ่อยเกินไป กรุณาลองใหม่ใน 1 ชั่วโมง' },
});
// จำกัดทั้ง IP และอีเมล ป้องกันการยิงหลาย IP เพื่อส่งอีเมลรบกวนสมาชิก; key เก็บเป็น hash
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => tokenHash(req.body.email),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'ขอลิงก์สำหรับอีเมลนี้บ่อยเกินไป กรุณาลองใหม่ใน 1 ชั่วโมง' },
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'พยายามหลายครั้งเกินไป กรุณาลองใหม่ใน 15 นาที' },
});

function runInBackground(job) {
  // ตอบคำขอโดยไม่รอค้นบัญชี/SMTP เพื่อไม่เปิดเผยว่ามีอีเมลนั้นอยู่หรือไม่จากข้อความหรือเวลาตอบ
  // งานส่งอยู่ใน process ปัจจุบัน หาก server รีสตาร์ตก่อนส่ง ผู้ใช้ต้องขอลิงก์ใหม่
  setImmediate(() => job().catch((error) => {
    const code = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'UNKNOWN';
    console.error('Password reset background task failed:', code);
  }));
}

async function deliverReset(email) {
  const [rows] = await pool.query('SELECT user_id, email FROM accounts WHERE email = ? LIMIT 1', [email]);
  const user = rows[0];
  if (!user) return;
  const token = randomBytes(32).toString('hex');
  const hash = tokenHash(token);
  // เก็บ SHA-256 เท่านั้น; token ใหม่แทนที่ token เก่าโดยไม่เปลี่ยนรหัสผ่านหรือ JWT จนยืนยันสำเร็จ
  await pool.query(
    'UPDATE accounts SET reset_token_hash = ?, reset_token_expires = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE) WHERE user_id = ?',
    [hash, user.user_id]
  );
  try { await mailer.sendPasswordReset(user.email, token); }
  catch (error) {
    // ล้างเฉพาะ token ที่ส่งไม่สำเร็จ ไม่ล้าง token ใหม่ของคำขออื่นที่อาจเข้ามาระหว่างรอ SMTP
    await pool.query('UPDATE accounts SET reset_token_hash = NULL, reset_token_expires = NULL WHERE user_id = ? AND reset_token_hash = ?', [user.user_id, hash]);
    throw error;
  }
}

async function findValidToken(token) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
  const [rows] = await pool.query(
    'SELECT user_id, email FROM accounts WHERE reset_token_hash = ? AND reset_token_expires > CURRENT_TIMESTAMP LIMIT 1',
    [tokenHash(token)]
  );
  return rows[0] || null;
}

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.post('/forgot-password', requestLimiter, (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 100) return res.status(400).json({ message: 'กรุณากรอกอีเมลให้ถูกต้อง' });
  req.body.email = email;
  next();
}, emailLimiter, (req, res) => {
  try { mailer.assertConfigured(); }
  catch { return res.status(503).json({ message: 'บริการส่งอีเมลยังไม่พร้อม กรุณาลองใหม่ภายหลัง' }); }
  runInBackground(() => deliverReset(req.body.email));
  res.status(202).json({ message: REQUEST_MESSAGE });
});

// ใช้ POST ตรวจลิงก์ เพื่อไม่ส่ง reset token ผ่าน URL ของ API ซึ่งมักถูกบันทึกใน access log
router.post('/reset-password/validate', resetLimiter, async (req, res) => {
  if (!await findValidToken(req.body?.token)) return res.status(400).json({ message: INVALID_LINK });
  res.json({ valid: true });
});

router.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, password, password_confirm: confirm } = req.body || {};
  const errors = validatePassword(password).map((message) => `รหัสผ่าน${message}`);
  if (typeof confirm !== 'string' || password !== confirm) errors.push('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
  if (errors.length) return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง', errors });
  const user = await findValidToken(token);
  if (!user) return res.status(400).json({ message: INVALID_LINK });
  const passwordHash = await bcrypt.hash(password, 12);
  // UPDATE เดียวตรวจ token/วันหมดอายุและล้าง token พร้อมเพิ่ม version จึงมีผู้ใช้ token สำเร็จได้ครั้งเดียว แม้ส่งพร้อมกัน
  const [result] = await pool.query(
    'UPDATE accounts SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL, token_version = token_version + 1 WHERE user_id = ? AND reset_token_hash = ? AND reset_token_expires > CURRENT_TIMESTAMP',
    [passwordHash, user.user_id, tokenHash(token)]
  );
  if (result.affectedRows !== 1) return res.status(400).json({ message: INVALID_LINK });
  runInBackground(() => mailer.sendPasswordChanged(user.email));
  res.json({ message: 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
});

module.exports = router;
