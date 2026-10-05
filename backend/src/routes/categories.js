const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// หมวดหมู่เป็นข้อมูลประกอบหน้าร้าน จึงเปิดให้อ่านได้โดยไม่ต้องเข้าสู่ระบบ
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT category_id, name, description FROM categories ORDER BY category_id'
  );
  res.json({ data: rows });
});

module.exports = router;
