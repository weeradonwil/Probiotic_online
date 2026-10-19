/* =====================================================================
   ระบบขายสินค้าโปรไบโอติก
   ต้องใช้ MySQL 8.0.16+ 
   ===================================================================== */


/* ---------------------------------------------------------------------
   ขั้นที่ 1: เตรียมฐานข้อมูล
   --------------------------------------------------------------------- */
CREATE DATABASE IF NOT EXISTS probiotic_shop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE probiotic_shop;


/* ---------------------------------------------------------------------
   ขั้นที่ 2: สร้างตาราง
   สร้างตารางแม่ก่อนตารางลูก ไม่อย่างงั้น FOREIGN KEY จะ error
   --------------------------------------------------------------------- */

-- accounts: ผู้ใช้งาน (Admin / Customer)
CREATE TABLE IF NOT EXISTS accounts (
  user_id             INT          NOT NULL AUTO_INCREMENT,
  username            VARCHAR(50)  NOT NULL,
  password            VARCHAR(255) NOT NULL,          -- bcrypt hash เท่านั้น ห้ามเก็บรหัสผ่านจริง
  email               VARCHAR(100) NOT NULL,
  full_name           VARCHAR(100) NULL,
  role                VARCHAR(20)  NULL DEFAULT 'Customer',  -- สมัครผ่านเว็บได้เป็น Customer เท่านั้น Admin สร้างจากสคริปต์
  created_at          DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  reset_token_hash    CHAR(64)     NULL,              -- เก็บ SHA-256 ของ token ไม่เก็บ token จริง (ถ้า DB รั่ว token ยังใช้ไม่ได้)
  reset_token_expires DATETIME     NULL,              -- ต้องตรวจเวลานี้ทุกครั้งก่อนยอมให้รีเซ็ตรหัสผ่าน
  token_version       INT UNSIGNED NOT NULL DEFAULT 0, -- เพิ่มเมื่อเปลี่ยนรหัสผ่านเพื่อยกเลิก JWT เดิม
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_accounts_username (username),
  UNIQUE KEY uq_accounts_email (email),
  CONSTRAINT chk_accounts_role CHECK (role IN ('Admin', 'Customer'))
) ENGINE=InnoDB;

-- categories: หมวดหมู่สินค้า
CREATE TABLE IF NOT EXISTS categories (
  category_id INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description TEXT         NULL,
  PRIMARY KEY (category_id)
) ENGINE=InnoDB;

-- products: สินค้า (1 หมวดหมู่ มีได้หลายสินค้า)
CREATE TABLE IF NOT EXISTS products (
  product_id  INT           NOT NULL AUTO_INCREMENT,
  category_id INT           NOT NULL,
  name        VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  price       DECIMAL(10,2) NOT NULL,
  stock       INT           NULL DEFAULT 0,
  image       VARCHAR(255)  NULL,                      -- เก็บเฉพาะชื่อไฟล์ ไม่เก็บ path เต็ม
  created_at  DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id),
  CONSTRAINT chk_products_price CHECK (price >= 0),
  CONSTRAINT chk_products_stock CHECK (stock >= 0),    -- กันสต็อกติดลบตอนตัดสต็อกจากการสั่งซื้อ
  INDEX idx_products_name (name)
) ENGINE=InnoDB;

-- orders: คำสั่งซื้อ (1 ผู้ใช้ มีได้หลายคำสั่งซื้อ)
CREATE TABLE IF NOT EXISTS orders (
  order_id         INT           NOT NULL AUTO_INCREMENT,
  user_id          INT           NOT NULL,
  shipping_address TEXT          NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  status           VARCHAR(30)   NULL DEFAULT 'Pending', -- Pending -> Paid -> Shipped (หรือ Cancelled)
  created_at       DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES accounts (user_id),
  CONSTRAINT chk_orders_status
    CHECK (status IN ('Pending', 'Paid', 'Shipped', 'Cancelled'))
) ENGINE=InnoDB;

-- order_items: รายการสินค้าในคำสั่งซื้อ
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT           NOT NULL AUTO_INCREMENT,
  order_id      INT           NOT NULL,
  product_id    INT           NOT NULL,
  quantity      INT           NOT NULL DEFAULT 1,
  price         DECIMAL(10,2) NOT NULL,               -- ราคา ณ วันที่สั่ง (snapshot) ห้ามดึงจาก products ภายหลัง ไม่งั้นใบเสร็จเก่าจะเปลี่ยนตามราคาใหม่
  subtotal      DECIMAL(10,2) NOT NULL,               -- quantity x price
  PRIMARY KEY (order_item_id),
  CONSTRAINT fk_items_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,  -- ลบออเดอร์แล้วรายการลบตาม
  CONSTRAINT fk_items_product
    FOREIGN KEY (product_id) REFERENCES products (product_id),              -- ไม่ CASCADE: สินค้าที่เคยขายแล้วลบไม่ได้ ให้ตั้ง stock = 0 แทน
  CONSTRAINT chk_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

-- payments: การชำระเงิน
CREATE TABLE IF NOT EXISTS payments (
  payment_id     INT           NOT NULL AUTO_INCREMENT,
  order_id       INT           NOT NULL,
  payment_method VARCHAR(50)   NULL DEFAULT 'Bank Transfer',
  amount         DECIMAL(10,2) NOT NULL,
  slip_image     VARCHAR(255)  NULL,
  phone          VARCHAR(20)   NULL,
  payment_status VARCHAR(30)   NULL DEFAULT 'Pending', -- Admin ตรวจสลิปแล้วเปลี่ยนเป็น Verified / Rejected
  payment_date   DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payments_order (order_id),             -- 1 ออเดอร์มีการชำระเงินได้ 1 รายการ (ความสัมพันธ์ 1 : 0..1)
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT chk_payments_status
    CHECK (payment_status IN ('Pending', 'Verified', 'Rejected'))
) ENGINE=InnoDB;


/* ---------------------------------------------------------------------
   ขั้นที่ 3: ข้อมูลตัวอย่าง (ชื่อและราคาเป็นข้อมูลสมมติ)
   ไม่ใส่ Admin ที่นี่ เพราะรหัสผ่านต้อง hash ด้วย bcrypt ผ่าน Node.js ก่อน
   --------------------------------------------------------------------- */
INSERT INTO categories (name, description)
SELECT seed.name, seed.description
FROM (
  SELECT 'โปรไบโอติกแบบแคปซูล' AS name, 'จุลินทรีย์ชนิดดีในรูปแบบแคปซูล ทานง่าย พกพาสะดวก' AS description
  UNION ALL SELECT 'โปรไบโอติกแบบผง' AS name, 'ผงชงดื่ม ละลายง่าย เหมาะกับการทานทุกวัน' AS description
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก' AS name, 'โยเกิร์ตดริงค์ คอมบูชา และเครื่องดื่มหมักพร้อมดื่ม' AS description
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์' AS name, 'อาหารของจุลินทรีย์ดี ช่วยเสริมการทำงานของโปรไบโอติก' AS description
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก' AS name, 'ผลิตภัณฑ์โปรไบโอติกสูตรสำหรับเด็ก รสชาติทานง่าย' AS description
  UNION ALL SELECT 'วิตามินและแร่ธาตุ' AS name, 'ผลิตภัณฑ์เสริมอาหารกลุ่มวิตามินและแร่ธาตุ' AS description
  UNION ALL SELECT 'ดูแลผิวและช่องปาก' AS name, 'ผลิตภัณฑ์ดูแลผิวและช่องปากที่เกี่ยวข้องกับโปรไบโอติก' AS description
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM categories existing WHERE existing.name = seed.name);

-- ผูกสินค้าเริ่มต้นกับหมวดหมู่ด้วยชื่อ เพื่อไม่สมมติว่า category_id ต้องเริ่มจาก 1
INSERT INTO products (category_id, name, description, price, stock, image)
SELECT category.category_id, seed.name, seed.description, seed.price, seed.stock, seed.image
FROM (
  SELECT 'โปรไบโอติกแบบแคปซูล' AS category_name, 'Lactobacillus Plus 30 แคปซูล' AS name, 'โปรไบโอติก 10 พันล้าน CFU สำหรับสมดุลระบบทางเดินอาหาร' AS description, 590.00 AS price, 50 AS stock, 'lactobacillus-plus.jpg' AS image
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Bifido Daily 60 แคปซูล', 'Bifidobacterium สำหรับการทานประจำวัน', 890.00, 40, 'bifido-daily.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Mix 20 ซอง', 'ผงโปรไบโอติกรสผลไม้รวม ละลายน้ำเย็นได้', 450.00, 60, 'powder-mix.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Kids Probiotic Powder 15 ซอง', 'สูตรสำหรับเด็ก รสสตรอว์เบอร์รี', 390.00, 35, 'kids-powder.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Yogurt Drink Original 6 ขวด', 'โยเกิร์ตดริงค์รสธรรมชาติ น้ำตาลต่ำ', 180.00, 100, 'yogurt-original.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Kombucha Ginger 330ml', 'คอมบูชารสขิง หมักธรรมชาติ', 85.00, 80, 'kombucha-ginger.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Inulin Prebiotic Fiber 200g', 'ไฟเบอร์พรีไบโอติกจากรากชิโครี', 320.00, 45, 'inulin-fiber.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Psyllium Husk 250g', 'เปลือกเมล็ดไซเลียม ช่วยการขับถ่าย', 280.00, 0, 'psyllium-husk.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Lactobacillus Rhamnosus 30 แคปซูล', 'โปรไบโอติกสายพันธุ์ Lactobacillus rhamnosus ชนิดแคปซูล', 650.00, 45, 'lactobacillus-rhamnosus.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Saccharomyces Boulardii 30 แคปซูล', 'โปรไบโอติกชนิดยีสต์ ทานง่าย พกพาสะดวก', 720.00, 40, 'saccharomyces-boulardii.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Probiotic 50 Billion 30 แคปซูล', 'โปรไบโอติกความเข้มข้นสูง 50 พันล้าน CFU', 990.00, 35, 'probiotic-50-billion.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Probiotic Women''s Care 30 แคปซูล', 'โปรไบโอติกสูตรสำหรับผู้หญิง', 780.00, 40, 'probiotic-womens-care.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Probiotic Men''s Care 30 แคปซูล', 'โปรไบโอติกสูตรสำหรับผู้ชาย', 780.00, 40, 'probiotic-mens-care.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Bifidobacterium Lactis 60 แคปซูล', 'โปรไบโอติกบิฟิโดแบคทีเรียม แลคติส สำหรับทานประจำวัน', 850.00, 30, 'bifidobacterium-lactis.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Probiotic Immune Support 30 แคปซูล', 'โปรไบโอติกผสมวิตามินซีและซิงค์', 690.00, 50, 'probiotic-immune-support.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบแคปซูล', 'Synbiotic Capsule 30 แคปซูล', 'ซินไบโอติก โปรไบโอติกผสมพรีไบโอติก', 820.00, 35, 'synbiotic-capsule.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Peach 20 ซอง', 'ผงโปรไบโอติกรสพีช ละลายน้ำเย็นได้', 450.00, 60, 'powder-peach.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Lemon 20 ซอง', 'ผงโปรไบโอติกรสเลมอน', 450.00, 60, 'powder-lemon.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Plain 30 ซอง', 'ผงโปรไบโอติกไม่แต่งรส ผสมกับอาหารหรือเครื่องดื่มได้', 590.00, 50, 'powder-plain.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Green Tea 20 ซอง', 'ผงโปรไบโอติกรสชาเขียว', 470.00, 50, 'powder-green-tea.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Mixed Berry 20 ซอง', 'ผงโปรไบโอติกรสมิกซ์เบอร์รี', 470.00, 55, 'powder-mixed-berry.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Travel Pack 10 ซอง', 'ผงโปรไบโอติกขนาดพกพา สำหรับเดินทาง', 260.00, 70, 'powder-travel-pack.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Mango 20 ซอง', 'ผงโปรไบโอติกรสมะม่วง', 450.00, 60, 'powder-mango.jpg'
  UNION ALL SELECT 'โปรไบโอติกแบบผง', 'Probiotic Powder Sugar-Free 30 ซอง', 'ผงโปรไบโอติกสูตรไม่เติมน้ำตาล', 620.00, 45, 'powder-sugar-free.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Yogurt Drink Strawberry 6 ขวด', 'โยเกิร์ตดื่มรสสตรอว์เบอร์รี', 190.00, 90, 'yogurt-strawberry.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Yogurt Drink Blueberry 6 ขวด', 'โยเกิร์ตดื่มรสบลูเบอร์รี', 190.00, 90, 'yogurt-blueberry.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Kombucha Lemon 330ml', 'คอมบูชารสเลมอน หมักธรรมชาติ', 85.00, 80, 'kombucha-lemon.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Kombucha Original 330ml', 'คอมบูชารสออริจินัล หมักธรรมชาติ', 85.00, 80, 'kombucha-original.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Kefir Original 250ml', 'เคเฟอร์นมหมัก รสธรรมชาติ', 79.00, 50, 'kefir-original.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Greek Yogurt Plain 150g', 'กรีกโยเกิร์ตข้น ไม่เติมน้ำตาล', 55.00, 90, 'greek-yogurt-plain.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Green Tea Kombucha 330ml', 'คอมบูชารสชาเขียว', 89.00, 70, 'kombucha-green-tea.jpg'
  UNION ALL SELECT 'เครื่องดื่มโปรไบโอติก', 'Fermented Fruit Drink 250ml', 'น้ำผลไม้หมักผสมจุลินทรีย์', 65.00, 70, 'fermented-fruit-drink.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'FOS Prebiotic Powder 200g', 'พรีไบโอติกชนิดผง ฟรุคโตโอลิโกแซ็กคาไรด์', 340.00, 50, 'fos-prebiotic-powder.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Chicory Root Fiber 250g', 'ไฟเบอร์จากรากชิโครี', 360.00, 45, 'chicory-root-fiber.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Oat Beta-Glucan 200g', 'ไฟเบอร์เบต้ากลูแคนจากข้าวโอ๊ต', 380.00, 40, 'oat-beta-glucan.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Acacia Fiber 250g', 'ไฟเบอร์จากกัมอะคาเซีย ละลายน้ำได้ดี', 390.00, 40, 'acacia-fiber.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Psyllium Husk Capsule 90 แคปซูล', 'เปลือกเมล็ดไซเลียมชนิดแคปซูล', 310.00, 60, 'psyllium-husk-capsule.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Prebiotic Fiber Gummy 30 เม็ด', 'กัมมี่ไฟเบอร์พรีไบโอติก', 330.00, 55, 'prebiotic-fiber-gummy.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Mixed Fiber Sachet 20 ซอง', 'ไฟเบอร์รวมชนิดซอง ชงดื่มง่าย', 420.00, 50, 'mixed-fiber-sachet.jpg'
  UNION ALL SELECT 'พรีไบโอติกและไฟเบอร์', 'Apple Pectin Fiber 200g', 'ไฟเบอร์เพคตินจากแอปเปิล', 350.00, 45, 'apple-pectin-fiber.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Probiotic Drops 10ml', 'โปรไบโอติกชนิดหยด สำหรับเด็กเล็ก', 390.00, 40, 'kids-probiotic-drops.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Toddler Probiotic Drops 8ml', 'โปรไบโอติกชนิดหยด สูตรสำหรับวัยหัดเดิน', 350.00, 40, 'toddler-probiotic-drops.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Chewable Strawberry 30 เม็ด', 'เม็ดเคี้ยว รสสตรอว์เบอร์รี', 320.00, 60, 'kids-chewable-strawberry.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Chewable Orange 30 เม็ด', 'เม็ดเคี้ยว รสส้ม', 320.00, 60, 'kids-chewable-orange.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Probiotic Powder Banana 15 ซอง', 'ผงชงดื่ม รสกล้วย', 380.00, 50, 'kids-powder-banana.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Probiotic Powder Vanilla 15 ซอง', 'ผงชงดื่ม รสวนิลา', 380.00, 50, 'kids-powder-vanilla.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Probiotic Gummy Berry 30 เม็ด', 'กัมมี่ รสเบอร์รี', 350.00, 55, 'kids-gummy-berry.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Prebiotic Fiber Gummy 30 เม็ด', 'กัมมี่ไฟเบอร์พรีไบโอติก สำหรับเด็ก', 330.00, 45, 'kids-fiber-gummy.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Yogurt Drink Plain 6 ขวด', 'โยเกิร์ตดื่มสำหรับเด็ก รสธรรมชาติ', 150.00, 80, 'kids-yogurt-plain.jpg'
  UNION ALL SELECT 'โปรไบโอติกสำหรับเด็ก', 'Kids Probiotic Sachet Apple 20 ซอง', 'ผงโปรไบโอติก รสแอปเปิล', 420.00, 35, 'kids-sachet-apple.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Vitamin C 500mg 60 เม็ด', 'ผลิตภัณฑ์เสริมอาหารวิตามินซี', 189.00, 100, 'vitamin-c-500.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Vitamin D3 1000 IU 60 แคปซูล', 'ผลิตภัณฑ์เสริมอาหารวิตามินดี 3', 259.00, 80, 'vitamin-d3.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Zinc 15mg 60 เม็ด', 'ผลิตภัณฑ์เสริมอาหารซิงค์', 169.00, 90, 'zinc-15.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Magnesium 200mg 60 เม็ด', 'ผลิตภัณฑ์เสริมอาหารแมกนีเซียม', 229.00, 80, 'magnesium-200.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Vitamin B Complex 60 เม็ด', 'ผลิตภัณฑ์เสริมอาหารวิตามินบีรวม', 199.00, 90, 'vitamin-b-complex.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Calcium + D 60 เม็ด', 'ผลิตภัณฑ์เสริมอาหารแคลเซียมผสมวิตามินดี', 249.00, 70, 'calcium-d.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Omega-3 Fish Oil 60 แคปซูล', 'ผลิตภัณฑ์เสริมอาหารน้ำมันปลา', 329.00, 60, 'omega-3.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Multivitamin Adult 60 เม็ด', 'วิตามินและแร่ธาตุรวม สำหรับผู้ใหญ่', 289.00, 80, 'multivitamin-adult.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Iron + Vitamin C 30 เม็ด', 'ผลิตภัณฑ์เสริมอาหารธาตุเหล็กผสมวิตามินซี', 179.00, 70, 'iron-vitamin-c.jpg'
  UNION ALL SELECT 'วิตามินและแร่ธาตุ', 'Vitamin E 400 IU 30 แคปซูล', 'ผลิตภัณฑ์เสริมอาหารวิตามินอี', 219.00, 60, 'vitamin-e-400.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Prebiotic Serum 30ml', 'เซรั่มบำรุงผิวสูตรอ่อนโยน', 459.00, 60, 'prebiotic-serum.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Probiotic Face Cream 50g', 'ครีมบำรุงผิวหน้า เนื้อบางเบา', 389.00, 60, 'face-cream.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Gentle Foam Cleanser 100ml', 'โฟมล้างหน้าสูตรอ่อนโยน ไม่มีน้ำหอม', 199.00, 90, 'foam-cleanser.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Balancing Toner 150ml', 'โทนเนอร์สูตรน้ำ ไม่มีแอลกอฮอล์', 259.00, 70, 'balancing-toner.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Sunscreen SPF50 PA+++ 40ml', 'ครีมกันแดดเนื้อบางเบา', 329.00, 80, 'sunscreen-spf50.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Body Lotion 250ml', 'โลชั่นบำรุงผิวกาย', 229.00, 80, 'body-lotion.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Gentle Body Wash 400ml', 'ครีมอาบน้ำสูตรอ่อนโยน สำหรับผิวบอบบาง', 179.00, 90, 'body-wash.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Probiotic Toothpaste 100g', 'ยาสีฟันสูตรอ่อนโยน', 149.00, 100, 'toothpaste.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Alcohol-Free Mouthwash 250ml', 'น้ำยาบ้วนปากสูตรอ่อนโยน ไม่มีแอลกอฮอล์', 159.00, 90, 'mouthwash.jpg'
  UNION ALL SELECT 'ดูแลผิวและช่องปาก', 'Oral Probiotic Lozenges 30 เม็ด', 'เม็ดอมโปรไบโอติก รสมินต์', 129.00, 100, 'oral-lozenges.jpg'
) AS seed
JOIN categories AS category ON category.name = seed.category_name
WHERE NOT EXISTS (SELECT 1 FROM products existing WHERE existing.category_id = category.category_id AND existing.name = seed.name); -- เติมเฉพาะสินค้าที่ยังไม่มี ไม่เขียนทับ stock หรือราคาเดิม


/* Step 4: verify (7 tables expected; categories = 7, products = 70) */

/* ---------------------------------------------------------------------
   Product reviews table and sample row from reviews.sql.
   Create it after accounts/products because it references both tables.
   The sample is added only when product #1 and account #1 already exist.
   --------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS reviews (
  review_id  INT          NOT NULL AUTO_INCREMENT,
  product_id INT          NOT NULL,
  user_id    INT          NOT NULL,
  order_id   INT          NULL,
  rating     INT          NOT NULL,
  comment    TEXT         NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  INDEX idx_reviews_product (product_id),
  INDEX idx_reviews_user (user_id),
  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Import the provided sample safely, only when its product/account references exist.
INSERT INTO reviews (product_id, user_id, order_id, rating, comment, created_at)
SELECT product.product_id, account.user_id, 2, 4, 'ขมไปหน่อย', '2026-10-18 14:44:55'
FROM products AS product
JOIN accounts AS account ON account.user_id = 1
WHERE product.product_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM reviews existing
    WHERE existing.product_id = product.product_id
      AND existing.user_id = account.user_id
      AND existing.order_id = 2
      AND existing.comment = 'ขมไปหน่อย'
  );

SHOW TABLES;

SELECT
  (SELECT COUNT(*) FROM categories) AS categories,
  (SELECT COUNT(*) FROM products)   AS products;

SELECT p.product_id, c.name AS category, p.name, p.price, p.stock
FROM products p
JOIN categories c ON c.category_id = p.category_id
ORDER BY p.product_id;
