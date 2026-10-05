const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const router = express.Router();
// ข้อมูลคำสั่งซื้อ การชำระเงิน และยอดขายต้องตรวจสิทธิ์ฝั่ง server ทุก endpoint
router.use(authenticate, requireRole('Admin'));

router.get('/overview', async (req, res) => {
  const days = Number(req.query.days) === 30 ? 30 : 7;
  const [sales, counts, series, recent] = await Promise.all([
    pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_status = 'Verified'"),
    pool.query('SELECT (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM payments) AS payments'),
    pool.query("SELECT DATE_FORMAT(payment_date, '%Y-%m-%d') AS day, SUM(amount) AS total FROM payments WHERE payment_status = 'Verified' AND payment_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY) AND payment_date < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) GROUP BY DATE_FORMAT(payment_date, '%Y-%m-%d') ORDER BY day", [days - 1]),
    pool.query('SELECT o.order_id, a.username, o.total_amount, o.status, o.created_at FROM orders o JOIN accounts a ON a.user_id = o.user_id ORDER BY o.order_id DESC LIMIT 5'),
  ]);
  // รวมเฉพาะรายการชำระเงิน Verified เพื่อไม่รวมยอดที่ยังไม่ได้ตรวจสอบ
  res.json({ sales: sales[0][0].total, ...counts[0][0], series: series[0], recent: recent[0], days });
});

router.get('/orders', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM orders');
  const [data] = await pool.query('SELECT o.order_id, a.username, o.shipping_address, o.total_amount, o.status, o.created_at FROM orders o JOIN accounts a ON a.user_id = o.user_id ORDER BY o.order_id DESC LIMIT 20 OFFSET ?', [(page - 1) * 20]);
  res.json({ data, total, page, limit: 20 });
});

router.get('/payments', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM payments');
  const [data] = await pool.query('SELECT payment_id, order_id, payment_method, amount, payment_status, payment_date FROM payments ORDER BY payment_id DESC LIMIT 20 OFFSET ?', [(page - 1) * 20]);
  res.json({ data, total, page, limit: 20 });
});
module.exports = router;
