/* =====================================================================
   ระบบขายสินค้าโปรไบโอติก  |  MySQL 8.0.16 ขึ้นไป


   ลำดับในไฟล์
     ขั้นที่ 1  สร้างฐานข้อมูล
     ขั้นที่ 2  สร้างตาราง 6 ตาราง (ตารางแม่ก่อน ตารางลูกทีหลัง)
     ขั้นที่ 3  ใส่ข้อมูลตัวอย่าง
     ขั้นที่ 4  คำสั่งตรวจสอบผล
   ===================================================================== */


/* ---------------------------------------------------------------------
   ขั้นที่ 1: สร้างฐานข้อมูล
   utf8mb4 = เก็บภาษาไทยและอีโมจิได้ครบ
   --------------------------------------------------------------------- */
DROP DATABASE IF EXISTS probiotic_shop;   -- ลบของเก่า (ข้อมูลเดิมหายหมด!)

CREATE DATABASE probiotic_shop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE probiotic_shop;


/* ---------------------------------------------------------------------
   ขั้นที่ 2: สร้างตาราง
   ต้องสร้างตารางที่ถูกอ้างอิง (แม่) ก่อน ไม่งั้น FOREIGN KEY จะ error
   ลำดับ: users, categories -> products, orders -> order_items, payments
   --------------------------------------------------------------------- */

-- 2.1 users: ผู้ใช้งาน (Admin / Customer)
CREATE TABLE users (
  user_id             INT          NOT NULL AUTO_INCREMENT,
  username            VARCHAR(50)  NOT NULL,
  password            VARCHAR(255) NOT NULL,          -- เก็บ bcrypt hash ห้ามเก็บรหัสจริง
  email               VARCHAR(100) NOT NULL,
  full_name           VARCHAR(100) NULL,
  role                VARCHAR(20)  NULL DEFAULT 'Customer',
  created_at          DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  reset_token_hash    CHAR(64)     NULL,              -- SHA-256 ของ token ลืมรหัสผ่าน
  reset_token_expires DATETIME     NULL,              -- เวลาหมดอายุของ token
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),            -- ห้าม username ซ้ำ
  UNIQUE KEY uq_users_email (email),                  -- ห้าม email ซ้ำ
  CONSTRAINT chk_users_role CHECK (role IN ('Admin', 'Customer'))
) ENGINE=InnoDB;

-- 2.2 categories: หมวดหมู่สินค้า
CREATE TABLE categories (
  category_id INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description TEXT         NULL,
  PRIMARY KEY (category_id)
) ENGINE=InnoDB;

-- 2.3 products: สินค้า (หมวดหมู่ 1 : สินค้า N)
CREATE TABLE products (
  product_id  INT           NOT NULL AUTO_INCREMENT,
  category_id INT           NOT NULL,
  name        VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  price       DECIMAL(10,2) NOT NULL,
  stock       INT           NULL DEFAULT 0,
  image       VARCHAR(255)  NULL,
  created_at  DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id),
  CONSTRAINT chk_products_price CHECK (price >= 0),
  CONSTRAINT chk_products_stock CHECK (stock >= 0),
  INDEX idx_products_name (name)                      -- ช่วยให้ค้นหาตามชื่อเร็วขึ้น
) ENGINE=InnoDB;

-- 2.4 orders: คำสั่งซื้อ (ผู้ใช้ 1 : คำสั่งซื้อ N)
CREATE TABLE orders (
  order_id         INT           NOT NULL AUTO_INCREMENT,
  user_id          INT           NOT NULL,
  shipping_address TEXT          NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  status           VARCHAR(30)   NULL DEFAULT 'Pending',
  created_at       DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (user_id),
  CONSTRAINT chk_orders_status
    CHECK (status IN ('Pending', 'Paid', 'Shipped', 'Cancelled'))
) ENGINE=InnoDB;

-- 2.5 order_items: รายการสินค้าในคำสั่งซื้อ (orders 1 : N, products 1 : N)
CREATE TABLE order_items (
  order_item_id INT           NOT NULL AUTO_INCREMENT,
  order_id      INT           NOT NULL,
  product_id    INT           NOT NULL,
  quantity      INT           NOT NULL DEFAULT 1,
  price         DECIMAL(10,2) NOT NULL,               -- ราคา ณ ตอนสั่งซื้อ (Snapshot)
  subtotal      DECIMAL(10,2) NOT NULL,               -- quantity x price
  PRIMARY KEY (order_item_id),
  CONSTRAINT fk_items_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product
    FOREIGN KEY (product_id) REFERENCES products (product_id),
  CONSTRAINT chk_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

-- 2.6 payments: การชำระเงิน (orders 1 : 0..1 payments)
CREATE TABLE payments (
  payment_id     INT           NOT NULL AUTO_INCREMENT,
  order_id       INT           NOT NULL,
  payment_method VARCHAR(50)   NULL DEFAULT 'Bank Transfer',
  amount         DECIMAL(10,2) NOT NULL,
  slip_image     VARCHAR(255)  NULL,
  phone          VARCHAR(20)   NULL,
  payment_status VARCHAR(30)   NULL DEFAULT 'Pending',
  payment_date   DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payments_order (order_id),             -- 1 order มี payment ได้ไม่เกิน 1
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT chk_payments_status
    CHECK (payment_status IN ('Pending', 'Verified', 'Rejected'))
) ENGINE=InnoDB;


/* ---------------------------------------------------------------------
   ขั้นที่ 3: ข้อมูลตัวอย่าง (ชื่อและราคาเป็นข้อมูลสมมติ แก้ได้)
   ยังไม่ใส่ผู้ใช้ Admin เพราะรหัสผ่านต้อง hash ด้วย bcrypt ก่อน
   (จะสร้างผ่านโปรแกรม Node.js ในขั้นถัดไป)
   --------------------------------------------------------------------- */
INSERT INTO categories (name, description) VALUES
  ('โปรไบโอติกแบบแคปซูล',  'จุลินทรีย์ชนิดดีในรูปแบบแคปซูล ทานง่าย พกพาสะดวก'),
  ('โปรไบโอติกแบบผง',      'ผงชงดื่ม ละลายง่าย เหมาะกับการทานทุกวัน'),
  ('เครื่องดื่มโปรไบโอติก', 'โยเกิร์ตดริงค์ คอมบูชา และเครื่องดื่มหมักพร้อมดื่ม'),
  ('พรีไบโอติกและไฟเบอร์', 'อาหารของจุลินทรีย์ดี ช่วยเสริมการทำงานของโปรไบโอติก');

-- category_id: 1=แคปซูล, 2=ผง, 3=เครื่องดื่ม, 4=พรีไบโอติก
INSERT INTO products (category_id, name, description, price, stock, image) VALUES
  (1, 'Lactobacillus Plus 30 แคปซูล', 'โปรไบโอติก 10 พันล้าน CFU สำหรับสมดุลระบบทางเดินอาหาร', 590.00,  50, 'lactobacillus-plus.jpg'),
  (1, 'Bifido Daily 60 แคปซูล',       'Bifidobacterium สำหรับการทานประจำวัน',                   890.00,  40, 'bifido-daily.jpg'),
  (2, 'Probiotic Powder Mix 20 ซอง',  'ผงโปรไบโอติกรสผลไม้รวม ละลายน้ำเย็นได้',                 450.00,  60, 'powder-mix.jpg'),
  (2, 'Kids Probiotic Powder 15 ซอง', 'สูตรสำหรับเด็ก รสสตรอว์เบอร์รี',                         390.00,  35, 'kids-powder.jpg'),
  (3, 'Yogurt Drink Original 6 ขวด',  'โยเกิร์ตดริงค์รสธรรมชาติ น้ำตาลต่ำ',                     180.00, 100, 'yogurt-original.jpg'),
  (3, 'Kombucha Ginger 330ml',        'คอมบูชารสขิง หมักธรรมชาติ',                               85.00,  80, 'kombucha-ginger.jpg'),
  (4, 'Inulin Prebiotic Fiber 200g',  'ไฟเบอร์พรีไบโอติกจากรากชิโครี',                          320.00,  45, 'inulin-fiber.jpg'),
  (4, 'Psyllium Husk 250g',           'เปลือกเมล็ดไซเลียม ช่วยการขับถ่าย',                      280.00,   0, 'psyllium-husk.jpg');  -- stock 0 ไว้ทดสอบ "สินค้าหมด"


/* ---------------------------------------------------------------------
   ขั้นที่ 4: ตรวจสอบผล (ควรได้ 6 ตาราง, categories = 4, products = 8)
   --------------------------------------------------------------------- */
SHOW TABLES;

SELECT
  (SELECT COUNT(*) FROM categories) AS categories,
  (SELECT COUNT(*) FROM products)   AS products;

SELECT p.product_id, c.name AS category, p.name, p.price, p.stock
FROM products p
JOIN categories c ON c.category_id = p.category_id
ORDER BY p.product_id;
