const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const IMAGE_RE = /^\w[\w.-]{0,254}\.(jpe?g|png|webp|gif)$/i; // เก็บเฉพาะชื่อไฟล์ กัน path เช่น ../../
const MAX_PRICE = 99999999.99;                               // DECIMAL(10,2)
const MAX_STOCK = 2147483647;                                // INT

function parseId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0 ? Number(value) : null;
}

// ตรวจและทำความสะอาดข้อมูลสินค้า (ใช้ทั้งเพิ่มและแก้ไข)
function validateProduct(body = {}) {
  const errors = [];

  const name = String(body.name ?? '').trim();
  if (!name || name.length > 150) errors.push('name ต้องไม่ว่าง และยาวไม่เกิน 150 ตัวอักษร');

  const categoryId = parseId(body.category_id);
  if (!categoryId) errors.push('category_id ไม่ถูกต้อง');

  const priceRaw = body.price;
  const price = priceRaw === '' || priceRaw == null ? NaN : Number(priceRaw);
  if (
    !Number.isFinite(price) || price < 0 || price > MAX_PRICE ||
    Math.abs(price * 100 - Math.round(price * 100)) > 1e-6
  ) {
    errors.push('price ต้องเป็นตัวเลข 0 ขึ้นไป ทศนิยมไม่เกิน 2 ตำแหน่ง');
  }

  const stockRaw = body.stock;
  const stock = stockRaw === '' || stockRaw == null ? 0 : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    errors.push('stock ต้องเป็นจำนวนเต็ม 0 ขึ้นไป');
  }

  const description =
    body.description == null || String(body.description).trim() === ''
      ? null
      : String(body.description).trim();
  if (description && description.length > 5000) errors.push('description ยาวเกิน 5000 ตัวอักษร');

  const image =
    body.image == null || String(body.image).trim() === '' ? null : String(body.image).trim();
  if (image && !IMAGE_RE.test(image)) {
    errors.push('image ต้องเป็นชื่อไฟล์ .jpg .jpeg .png .webp หรือ .gif เท่านั้น');
  }

  return {
    errors,
    value: { name, categoryId, description, price, stock, image },
  };
}

async function getById(id) {
  const [rows] = await pool.query(
    `SELECT p.product_id, p.category_id, c.name AS category_name, p.name, p.description,
            p.price, p.stock, p.image, p.created_at
       FROM products p
       JOIN categories c ON c.category_id = p.category_id
      WHERE p.product_id = ?`,
    [id]
  );
  return rows[0] || null;
}

// ---------- GET /api/products?q=&category_id=&page=&limit= ----------
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
  const sorting = { default: 'p.product_id', price_asc: 'p.price ASC, p.product_id', price_desc: 'p.price DESC, p.product_id', newest: 'p.product_id DESC' };
  const orderBy = Object.hasOwn(sorting, String(req.query.sort)) ? sorting[String(req.query.sort)] : sorting.default;

  const where = [];
  const params = [];

  if (req.query.category_id) {
    const categoryId = parseId(req.query.category_id);
    if (!categoryId) return res.status(400).json({ message: 'category_id ไม่ถูกต้อง' });
    where.push('p.category_id = ?');
    params.push(categoryId);
  }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM products p ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT p.product_id, p.category_id, c.name AS category_name, p.name, p.description,
            p.price, p.stock, p.image, p.created_at
       FROM products p
       JOIN categories c ON c.category_id = p.category_id
       ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  res.json({ data: rows, total, page, limit });
});

// ---------- GET /api/products/:id/reviews - ดึงรีวิวจริงของสินค้านั้นๆ ----------
router.get('/:id/reviews', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'รหัสสินค้าไม่ถูกต้อง' });

  try {
    const [reviews] = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at,
              COALESCE(a.full_name, a.username) AS username
       FROM reviews r
       JOIN accounts a ON r.user_id = a.user_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'ดึงข้อมูลรีวิวไม่สำเร็จ', error: err.message });
  }
});

// ---------- POST /api/products/:id/reviews - สมาชิกส่งรีวิวจริง ----------
router.post('/:id/reviews', authenticate, async (req, res) => {
  const productId = parseId(req.params.id);
  if (!productId) return res.status(400).json({ message: 'รหัสสินค้าไม่ถูกต้อง' });

  const userId = req.user.user_id || req.user.id;
  const { rating, comment, order_id } = req.body;

  const score = parseInt(rating, 10);
  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ message: 'คะแนนรีวิวต้องอยู่ระหว่าง 1-5 ดาว' });
  }

  const commentText = String(comment ?? '').trim();
  if (!commentText) {
    return res.status(400).json({ message: 'กรุณากรอกข้อความรีวิว' });
  }

  try {
    await pool.query(
      `INSERT INTO reviews (product_id, user_id, order_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, userId, order_id ? parseId(order_id) : null, score, commentText]
    );
    res.status(201).json({ message: 'บันทึกรีวิวของคุณเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ message: 'บันทึกรีวิวไม่สำเร็จ', error: err.message });
  }
});

// ---------- GET /api/products/:id ----------
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'รหัสสินค้าไม่ถูกต้อง' });

  const product = await getById(id);
  if (!product) return res.status(404).json({ message: 'ไม่พบสินค้า' });
  res.json({ data: product });
});

// ---------- POST /api/products (Admin) ----------
router.post('/', authenticate, requireRole('Admin'), async (req, res) => {
  const { errors, value } = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง', errors });

  try {
    const [result] = await pool.query(
      `INSERT INTO products (category_id, name, description, price, stock, image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [value.categoryId, value.name, value.description, value.price, value.stock, value.image]
    );
    res.status(201).json({ message: 'เพิ่มสินค้าสำเร็จ', data: await getById(result.insertId) });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'ไม่พบหมวดหมู่ที่ระบุ' });
    }
    throw err;
  }
});

// ---------- PUT /api/products/:id (Admin) ----------
router.put('/:id', authenticate, requireRole('Admin'), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'รหัสสินค้าไม่ถูกต้อง' });

  const { errors, value } = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง', errors });

  if (!(await getById(id))) return res.status(404).json({ message: 'ไม่พบสินค้า' });

  try {
    await pool.query(
      `UPDATE products
          SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, image = ?
        WHERE product_id = ?`,
      [value.categoryId, value.name, value.description, value.price, value.stock, value.image, id]
    );
    res.json({ message: 'แก้ไขสินค้าสำเร็จ', data: await getById(id) });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'ไม่พบหมวดหมู่ที่ระบุ' });
    }
    throw err;
  }
});

// ---------- DELETE /api/products/:id (Admin) ----------
router.delete('/:id', authenticate, requireRole('Admin'), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'รหัสสินค้าไม่ถูกต้อง' });

  try {
    const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบสินค้า' });
    res.json({ message: 'ลบสินค้าสำเร็จ' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        message: 'ลบไม่ได้ เพราะสินค้านี้เคยถูกสั่งซื้อแล้ว แนะนำให้แก้ไข stock เป็น 0 แทน',
      });
    }
    throw err;
  }
});

module.exports = router;