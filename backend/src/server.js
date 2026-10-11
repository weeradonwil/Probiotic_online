require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./config/db');
const { authenticate, requireRole } = require('./middleware/auth');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// ให้เข้าถึงไฟล์ที่อัปโหลด เช่น สลิปโอนเงิน
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin', require('./routes/admin'));

// ตรวจสอบสถานะ Server และ Database
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('DB health check failed:', err.message);
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// ชั่วคราว: ทดสอบสิทธิ์ Admin
app.get('/api/admin/ping', authenticate, requireRole('Admin'), (req, res) => {
  res.json({ message: 'สวัสดี Admin', user: req.user });
});

app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบ endpoint ที่เรียก' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'รูปแบบ JSON ไม่ถูกต้อง' });
  }
  console.error(err);
  res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดภายในระบบ' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));