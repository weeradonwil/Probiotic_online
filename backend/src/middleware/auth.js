const jwt = require('jsonwebtoken');

// ตรวจ JWT จาก header:  Authorization: Bearer <token>
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { user_id: payload.user_id, role: payload.role };
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่'
        : 'Token ไม่ถูกต้อง';
    return res.status(401).json({ message });
  }
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