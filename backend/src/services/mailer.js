const nodemailer = require('nodemailer');

let transporter;

function mailError(code) {
  const error = new Error('Email service configuration is invalid');
  error.code = code;
  return error;
}

function getFrontendUrl() {
  let url;
  try { url = new URL(process.env.FRONTEND_URL); }
  catch { throw mailError('FRONTEND_URL_INVALID'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw mailError('FRONTEND_URL_INVALID');
  }
  // ลิงก์ใช้งานจริงต้องเป็น HTTPS; URL มาจาก config เท่านั้น ไม่ใช้ Host header ที่ผู้เรียกปลอมได้
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw mailError('FRONTEND_URL_INVALID');
  return url.origin;
}

function assertConfigured() {
  getFrontendUrl();
  const port = Number(process.env.SMTP_PORT);
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw mailError('SMTP_CONFIG_MISSING');
  }
}

function getTransporter() {
  assertConfigured();
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transporter;
}

function sendPasswordReset(email, token) {
  const url = new URL('/reset-password', getFrontendUrl());
  url.searchParams.set('token', token);
  // ส่ง raw token เฉพาะในอีเมล ไม่คืนให้ frontend ที่ขอลิงก์ และไม่เขียนลง log
  return getTransporter().sendMail({
    from: { name: 'Probiotic Shop', address: process.env.SMTP_USER },
    to: email,
    subject: 'ตั้งรหัสผ่านใหม่สำหรับบัญชี Probiotic Shop',
    text: `คุณได้ขอตั้งรหัสผ่านใหม่สำหรับบัญชี Probiotic Shop\n\nเปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ครั้งเดียวภายใน 15 นาที):\n${url.href}\n\nหากคุณไม่ได้เป็นผู้ขอ สามารถละเว้นอีเมลนี้ได้ รหัสผ่านของคุณยังไม่ถูกเปลี่ยน\n\nProbiotic Shop`,
  });
}

function sendPasswordChanged(email) {
  return getTransporter().sendMail({
    from: { name: 'Probiotic Shop', address: process.env.SMTP_USER },
    to: email,
    subject: 'รหัสผ่านบัญชี Probiotic Shop ของคุณถูกเปลี่ยนแล้ว',
    text: 'รหัสผ่านบัญชี Probiotic Shop ของคุณถูกเปลี่ยนแล้ว และเซสชันเข้าสู่ระบบเดิมถูกยกเลิก\n\nหากคุณไม่ได้ดำเนินการนี้ กรุณาขอรีเซ็ตรหัสผ่านใหม่และตรวจสอบความปลอดภัยของบัญชีอีเมล\n\nProbiotic Shop',
  });
}

// ตรวจ SMTP โดยไม่ส่งอีเมล ใช้กับสคริปต์ check-mail
function verifyConnection() { return getTransporter().verify(); }

module.exports = { assertConfigured, sendPasswordReset, sendPasswordChanged, verifyConnection };
