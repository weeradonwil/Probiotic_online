const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

// ตั้งค่าโฟลเดอร์สำหรับอัปโหลดสลิป
const uploadDir = path.join(__dirname, '../../uploads/slips');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `slip-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น'));
    }
  }
});

// 1. POST /api/orders - สั่งซื้อสินค้า, ตรวจสอบและตัดสต็อก
router.post('/', authenticate, async (req, res) => {
  const { shipping_address, items } = req.body;
  const userId = req.user.user_id || req.user.id;

  if (!shipping_address || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'กรุณากรอกที่อยู่จัดส่งและระบุสินค้าที่ต้องการสั่งซื้อ' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = item.product_id;
      const quantity = parseInt(item.quantity, 10);

      if (!productId || !quantity || quantity <= 0) {
        throw new Error('จำนวนสินค้าไม่ถูกต้อง');
      }

      const [products] = await connection.query(
        'SELECT product_id, name, price, stock FROM products WHERE product_id = ? FOR UPDATE',
        [productId]
      );

      if (products.length === 0) {
        throw new Error(`ไม่พบสินค้ารหัส ${productId}`);
      }

      const product = products[0];

      if (product.stock < quantity) {
        throw new Error(`สินค้า "${product.name}" มีสต็อกไม่พอ (เหลือเพียง ${product.stock} ชิ้น)`);
      }

      const price = parseFloat(product.price);
      const subtotal = price * quantity;
      totalAmount += subtotal;

      orderItems.push({
        product_id: productId,
        quantity,
        price,
        subtotal
      });

      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE product_id = ?',
        [quantity, productId]
      );
    }

    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, shipping_address, total_amount, status) VALUES (?, ?, ?, ?)',
      [userId, shipping_address.trim(), totalAmount, 'Pending']
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price, item.subtotal]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'สร้างคำสั่งซื้อสำเร็จ',
      order_id: orderId,
      total_amount: totalAmount,
      status: 'Pending'
    });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ' });
  } finally {
    connection.release();
  }
});

// 2. POST /api/orders/:id/pay - อัปโหลดสลิปแจ้งชำระเงิน
router.post('/:id/pay', authenticate, upload.single('slip'), async (req, res) => {
  const orderId = req.params.id;
  const { phone, payment_method } = req.body;
  const userId = req.user.user_id || req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'กรุณาแนบรูปสลิปหลักฐานการโอนเงิน' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      'SELECT total_amount, status FROM orders WHERE order_id = ? AND user_id = ? FOR UPDATE',
      [orderId, userId]
    );

    if (orders.length === 0) {
      throw new Error('ไม่พบคำสั่งซื้อ หรือคุณไม่มีสิทธิ์ดำเนินการคำสั่งซื้อนี้');
    }

    const order = orders[0];
    if (order.status === 'Cancelled') {
      throw new Error('คำสั่งซื้อนี้ถูกยกเลิกแล้ว');
    }

    const slipImage = req.file.filename;

    await connection.query(
      `INSERT INTO payments (order_id, payment_method, amount, slip_image, phone, payment_status, payment_date)
       VALUES (?, ?, ?, ?, ?, 'Pending', NOW())
       ON DUPLICATE KEY UPDATE
         payment_method = VALUES(payment_method),
         amount = VALUES(amount),
         slip_image = VALUES(slip_image),
         phone = VALUES(phone),
         payment_status = 'Pending',
         payment_date = NOW()`,
      [orderId, payment_method || 'Bank Transfer', order.total_amount, slipImage, phone || null]
    );

    await connection.commit();

    res.json({
      message: 'แจ้งชำระเงินสำเร็จ กรุณารอเจ้าหน้าที่ตรวจสอบยอดเงิน',
      slip_image: slipImage
    });
  } catch (err) {
    await connection.rollback();
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ message: err.message || 'เกิดข้อผิดพลาดในการแจ้งชำระเงิน' });
  } finally {
    connection.release();
  }
});

// 3. GET /api/orders/my-orders - รายการคำสั่งซื้อของตนเองพร้อมรายการสินค้าข้างใน
router.get('/my-orders', authenticate, async (req, res) => {
  const userId = req.user.user_id || req.user.id;
  try {
    const [orders] = await pool.query(
      `SELECT o.*, p.payment_status, p.payment_method, p.slip_image, p.phone
       FROM orders o
       LEFT JOIN payments p ON o.order_id = p.order_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, p.name AS product_name, p.image AS product_image
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'ดึงข้อมูลคำสั่งซื้อไม่สำเร็จ', error: err.message });
  }
});

// 4. GET /api/orders/admin/all - สำหรับ Admin ดูคำสั่งซื้อทั้งหมด
router.get('/admin/all', authenticate, requireRole('Admin'), async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, a.username, a.email, a.full_name,
              p.payment_id, p.payment_status, p.payment_method, p.slip_image, p.phone
       FROM orders o
       JOIN accounts a ON o.user_id = a.user_id
       LEFT JOIN payments p ON o.order_id = p.order_id
       ORDER BY o.created_at DESC`
    );

    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, p.name AS product_name, p.image AS product_image
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'ดึงข้อมูลคำสั่งซื้อทั้งหมดไม่สำเร็จ', error: err.message });
  }
});

// 5. PATCH /api/orders/admin/:id/status - สำหรับ Admin ปรับสถานะคำสั่งซื้อและการชำระเงิน
router.patch('/admin/:id/status', authenticate, requireRole('Admin'), async (req, res) => {
  const orderId = req.params.id;
  const { status, payment_status } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (status) {
      await connection.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
    }

    if (payment_status) {
      await connection.query('UPDATE payments SET payment_status = ? WHERE order_id = ?', [payment_status, orderId]);
    }

    await connection.commit();
    res.json({ message: 'อัปเดตสถานะเรียบร้อยแล้ว' });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || 'ไม่สามารถอัปเดตสถานะได้' });
  } finally {
    connection.release();
  }
});

module.exports = router;