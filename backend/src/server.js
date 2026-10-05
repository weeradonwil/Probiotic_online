require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./config/db');
const { authenticate, requireRole } = require('./middleware/auth');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// ตรวจว่า server และ DB ทำงานปกติ
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('DB health check failed:', err.message);
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', require('./routes/auth'));

// การอ่านสินค้าและหมวดหมู่เปิดให้บุคคลทั่วไป ส่วนการแก้ไขสินค้าตรวจสิทธิ์ใน route
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin', require('./routes/admin'));

// ชั่วคราว: ใช้ทดสอบว่า Customer เข้าไม่ได้ / Admin เข้าได้ (จะแทนด้วย route จริงภายหลัง)
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
  res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));

// หน้าที่ สร้าง Express Server เปิดใช้งาน Middleware ต่าง ๆ เชื่อม Routes กำหนด Endpoint เปิด Port
