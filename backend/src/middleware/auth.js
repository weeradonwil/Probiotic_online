const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ตรวจ JWT จาก header:  Authorization: Bearer <token>
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่'
        : 'Token ไม่ถูกต้อง';
    return res.status(401).json({ message });
  }

  // JWT เก่าที่ไม่มี version ถือเป็น 0; หลังรีเซ็ต version ใน DB เพิ่ม จึงถูกปฏิเสธทันที
  const version = payload.token_version ?? 0;
  if (!Number.isSafeInteger(payload.user_id) || payload.user_id < 1 || !Number.isSafeInteger(version) || version < 0) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
  }
  try {
    const [rows] = await pool.query('SELECT user_id, role, token_version FROM accounts WHERE user_id = ? LIMIT 1', [payload.user_id]);
    const user = rows[0];
    if (!user || user.token_version !== version) return res.status(401).json({ message: 'เซสชันถูกยกเลิก กรุณาเข้าสู่ระบบใหม่' });
    // บทบาทจาก DB ปัจจุบัน ป้องกัน JWT เก่าของบัญชีที่ถูกเปลี่ยนสิทธิ์หรือลบแล้ว
    req.user = { user_id: user.user_id, role: user.role };
    return next();
  } catch (error) { return next(error); }
}

// จำกัดสิทธิ์ตาม role เช่น requireRole('Admin')  (ต้องใช้หลัง authenticate)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
