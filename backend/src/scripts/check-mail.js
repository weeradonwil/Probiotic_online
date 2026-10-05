require('dotenv').config();
const { verifyConnection } = require('../services/mailer');

// ตรวจการเชื่อมต่อและยืนยันตัวตน SMTP โดยไม่ส่งข้อความและไม่แสดง credentials
verifyConnection().then(() => console.log('SMTP connection and authentication verified (no email sent)')).catch((error) => {
  const code = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'UNKNOWN';
  const responseCode = Number.isInteger(error.responseCode) ? ` (SMTP ${error.responseCode})` : '';
  console.error(`SMTP verification failed: ${code}${responseCode}`);
  process.exitCode = 1;
});
