require('dotenv').config();
const pool = require('../config/db');

async function main() {
  const [columns] = await pool.query('SHOW COLUMNS FROM accounts');
  const names = new Set(columns.map((column) => column.Field));
  // เพิ่มเฉพาะคอลัมน์ที่ขาด รันซ้ำได้ และไม่ลบ/สร้างตารางใหม่หรือแก้ข้อมูลบัญชีเดิม
  const additions = {
    reset_token_hash: 'ALTER TABLE accounts ADD COLUMN reset_token_hash CHAR(64) NULL',
    reset_token_expires: 'ALTER TABLE accounts ADD COLUMN reset_token_expires DATETIME NULL',
    token_version: 'ALTER TABLE accounts ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0',
  };
  for (const [name, sql] of Object.entries(additions)) {
    if (!names.has(name)) {
      await pool.query(sql);
      console.log(`Added accounts.${name}`);
    }
  }
  console.log('Password reset schema is ready');
}

main().catch((error) => {
  console.error('Password reset migration failed:', error.code || 'UNKNOWN');
  process.exitCode = 1;
}).finally(() => pool.end());
