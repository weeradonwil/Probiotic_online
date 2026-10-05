const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories  (ต้อง login) ใช้แสดงตัวกรองหมวดหมู่ และ dropdown ในหน้า Admin
router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT category_id, name, description FROM categories ORDER BY category_id'
  );
  res.json({ data: rows });
});

module.exports = router;
