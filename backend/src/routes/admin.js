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

router.get('/monthly-report', async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'กรุณาระบุเดือนและปีให้ถูกต้อง' });
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const nextMonthStart = `${nextMonthDate} 00:00:00`;
  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
  const previousMonthStart = `${previousMonthDate} 00:00:00`;

  try {
    const paidPeriodSql = `
      FROM payments p
      JOIN orders o ON o.order_id = p.order_id
      WHERE p.payment_status = 'Verified'
        AND LOWER(COALESCE(o.status, '')) IN ('paid', 'shipped')
        AND p.payment_date >= ? AND p.payment_date < ?`;
    const [revenueRows, previousRevenueRows, statusRows, unitRows, productRows] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(p.amount), 0) AS revenue, COUNT(*) AS paid_orders ${paidPeriodSql}`, [monthStart, nextMonthStart]),
      pool.query(`SELECT COALESCE(SUM(p.amount), 0) AS revenue ${paidPeriodSql}`, [previousMonthStart, monthStart]),
      pool.query(
        `SELECT LOWER(COALESCE(status, 'unknown')) AS status, COUNT(*) AS total
         FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY LOWER(COALESCE(status, 'unknown'))`,
        [monthStart, nextMonthStart]
      ),
      pool.query(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS units_sold
         FROM payments p
         JOIN orders o ON o.order_id = p.order_id
         JOIN order_items oi ON oi.order_id = o.order_id
         WHERE p.payment_status = 'Verified'
           AND LOWER(COALESCE(o.status, '')) IN ('paid', 'shipped')
           AND p.payment_date >= ? AND p.payment_date < ?`,
        [monthStart, nextMonthStart]
      ),
      pool.query(
        `SELECT pr.name, SUM(oi.quantity) AS units_sold, SUM(oi.subtotal) AS sales
         FROM payments p
         JOIN orders o ON o.order_id = p.order_id
         JOIN order_items oi ON oi.order_id = o.order_id
         JOIN products pr ON pr.product_id = oi.product_id
         WHERE p.payment_status = 'Verified'
           AND LOWER(COALESCE(o.status, '')) IN ('paid', 'shipped')
           AND p.payment_date >= ? AND p.payment_date < ?
         GROUP BY pr.product_id, pr.name
         ORDER BY units_sold DESC, sales DESC, pr.name ASC LIMIT 5`,
        [monthStart, nextMonthStart]
      ),
    ]);

    const ordersByStatus = { Pending: 0, Paid: 0, Shipped: 0, Cancelled: 0, Other: 0 };
    for (const row of statusRows[0]) {
      const key = ({ pending: 'Pending', paid: 'Paid', shipped: 'Shipped', cancelled: 'Cancelled' })[row.status] || 'Other';
      ordersByStatus[key] += Number(row.total);
    }

    res.json({
      year,
      month,
      revenue: Number(revenueRows[0][0].revenue),
      previousRevenue: Number(previousRevenueRows[0][0].revenue),
      paidOrders: Number(revenueRows[0][0].paid_orders),
      unitsSold: Number(unitRows[0][0].units_sold),
      totalOrders: Object.values(ordersByStatus).reduce((sum, count) => sum + count, 0),
      ordersByStatus,
      topProducts: productRows[0].map(product => ({
        name: product.name,
        unitsSold: Number(product.units_sold),
        sales: Number(product.sales),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'ดึงรายงานรายเดือนไม่สำเร็จ' });
  }
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
