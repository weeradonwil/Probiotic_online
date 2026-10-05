// สร้างผู้ใช้ Admin คนแรก:  npm run create-admin
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { validatePassword } = require('../utils/passwordPolicy');

const BCRYPT_ROUNDS = 12;

async function main() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const fullName = (process.env.ADMIN_FULL_NAME || '').trim() || null;
  const password = process.env.ADMIN_PASSWORD || '';

  if (!username || !email || !password) {
    throw new Error('ต้องกำหนด ADMIN_USERNAME, ADMIN_EMAIL และ ADMIN_PASSWORD');
  }

  const problems = validatePassword(password);
  if (problems.length) {
    throw new Error('ADMIN_PASSWORD ไม่ผ่านเงื่อนไข:\n - ' + problems.join('\n - '));
  }

  const [exists] = await pool.query(
    'SELECT user_id FROM accounts WHERE username = ? OR email = ? LIMIT 1',
    [username, email]
  );
  if (exists.length) {
    throw new Error('มี username หรือ email นี้ในระบบแล้ว');
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO accounts (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)',
    [username, hash, email, fullName, 'Admin']
  );

  console.log(`สร้าง Admin สำเร็จ (user_id = ${result.insertId}, username = ${username})`);
}

main()
  .catch((err) => {
    console.error('ผิดพลาด:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());