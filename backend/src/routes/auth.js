const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { validatePassword } = require('../utils/passwordPolicy');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

// hash หลอก ใช้เทียบเมื่อไม่พบ username เพื่อให้เวลาตอบใกล้เคียงกัน (กันการเดา username)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

// จำกัดจำนวนครั้งที่ล้มเหลว: 10 ครั้ง / 15 นาที ต่อ IP (ครั้งที่สำเร็จไม่นับ)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'พยายามหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_]{3,50}$/;

// ---------- POST /api/auth/register ----------
router.post('/register', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const fullName = String(req.body.full_name || '').trim() || null;
  const password = req.body.password;

  const errors = [];
  if (!USERNAME_RE.test(username)) {
    errors.push('username ต้องเป็น a-z, A-Z, 0-9 หรือ _ ยาว 3-50 ตัวอักษร');
  }
  if (!EMAIL_RE.test(email) || email.length > 100) errors.push('รูปแบบอีเมลไม่ถูกต้อง');
  if (fullName && fullName.length > 100) errors.push('ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร');
  errors.push(...validatePassword(password).map((m) => `รหัสผ่าน${m}`));

  if (errors.length) {
    return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง', errors });
  }

  const [dup] = await pool.query(
    'SELECT username, email FROM accounts WHERE username = ? OR email = ? LIMIT 2',
    [username, email]
  );
  if (dup.length) {
    const taken = [];
    if (dup.some((u) => u.username === username)) taken.push('username');
    if (dup.some((u) => u.email === email)) taken.push('email');
    return res.status(409).json({ message: `${taken.join(' และ ')} นี้ถูกใช้งานแล้ว` });
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    // role กำหนดเป็น Customer เสมอ ไม่รับค่าจาก client
    const [result] = await pool.query(
      'INSERT INTO accounts (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, hash, email, fullName, 'Customer']
    );
    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      user: { user_id: result.insertId, username, email, full_name: fullName, role: 'Customer' },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'username หรือ email นี้ถูกใช้งานแล้ว' });
    }
    throw err;
  }
});

// ---------- POST /api/auth/login ----------
router.post('/login', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ message: 'กรุณากรอก username และ password' });
  }

  const [rows] = await pool.query(
    'SELECT user_id, username, password, email, full_name, role FROM accounts WHERE username = ? LIMIT 1',
    [username]
  );
  const user = rows[0];

  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) {
    // ข้อความเดียวกันเสมอ ไม่บอกว่าผิดที่ username หรือ password
    return res.status(401).json({ message: 'username หรือ password ไม่ถูกต้อง' });
  }

  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );

  res.json({
    message: 'เข้าสู่ระบบสำเร็จ',
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
  });
});

// ---------- GET /api/auth/me (ต้องมี token) ----------
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT user_id, username, email, full_name, role, created_at FROM accounts WHERE user_id = ?',
    [req.user.user_id]
  );
  if (!rows.length) return res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้' });
  res.json({ user: rows[0] });
});

module.exports = router;