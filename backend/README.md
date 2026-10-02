# ระบบขายสินค้าโปรไบโอติก (Probiotic Product Sales System)

โปรเจกต์วิชา 09143322 การพัฒนาระบบงานฐานข้อมูลโดยโปรแกรมประยุกต์
มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี ภาคการศึกษาที่ 1 ปีการศึกษา 2569

**สมาชิก:** วีรดนย์ วิลัยมาตย์ · สุรชัย พูลชาติ · อัครวินท์ ดีจิวารณ์

| กำหนดส่ง | งาน |
|---|---|
| **6 ต.ค. 2569** | ส่วนที่ 1: รายงานข้อ 1-4 + นำเสนอโปรแกรม (ข้อ 5-6) |
| 27 ต.ค. 2569 | ส่วนที่ 2: สั่งซื้อ, ชำระเงิน, ใบเสร็จ PDF, Dashboard |

---

## สถานะงานส่วนที่ 1

สัญลักษณ์: ✅ เสร็จแล้ว · 🔄 กำลังทำ · ⬜ ยังไม่เริ่ม

### เอกสารรายงาน (ข้อ 1-4)

| งาน | สถานะ | หมายเหตุ |
|---|---|---|
| ข้อ 1 เก็บความต้องการ | ✅ | อยู่ในรายงานบทที่ 2 |
| ข้อ 2 ER-Diagram | 🔄 | แก้โค้ดใหม่แล้ว ต้องนำรูปใหม่ไปแทนในรายงาน และเติมป้าย 1–N / 1–0..1 |
| ข้อ 3 Mapping เป็น Schema | ✅ | บทที่ 4 |
| ข้อ 4 Data Dictionary | ✅ | บทที่ 5 (เพิ่ม `reset_token_hash`, `reset_token_expires` แล้ว) |

### โปรแกรม (ข้อ 5-6)

| ข้อ | งาน | สถานะ |
|---|---|---|
| 5 | ฐานข้อมูล MySQL (6 ตาราง + ข้อมูลตัวอย่าง) | ✅ |
| 6 | Backend: ตั้งค่า Express + เชื่อม MySQL | ✅ |
| 6.6.6 | เงื่อนไขรหัสผ่าน (≥8 ตัว, พิมพ์เล็ก/ใหญ่/ตัวเลข/อักขระพิเศษ) | ✅ |
| 6.6.2 | สร้างผู้ใช้ Admin คนแรก (สคริปต์) | ✅ |
| 6.5 | สมัครสมาชิก | 🔄 โค้ดเสร็จ กำลังทดสอบใน Postman |
| 6.6.1, 6.6.3 | Login ด้วย JWT + แยกสิทธิ์ Admin/Customer | 🔄 โค้ดเสร็จ กำลังทดสอบใน Postman |
| 6.3, 6.4 | API สินค้า: เพิ่ม/แก้ไข/ลบ/ค้นหา (Admin) + ดูสินค้า (Customer) | ⬜ |
| 6.6.5 | ลืมรหัสผ่าน: ส่งลิงก์รีเซ็ตทางอีเมล (Nodemailer) | ⬜ |
| 6.6.1 | ชุดทดสอบ Postman สำหรับโชว์ JWT | ⬜ |
| 6.1 | Frontend (Vue.js): หน้า Home | ⬜ |
| 6.2 | Frontend: หน้า Contact (ที่อยู่ + รายชื่อสมาชิก) | ⬜ |
| 6.3-6.5 | Frontend: หน้า Admin, หน้าสินค้า, สมัครสมาชิก, Login | ⬜ |

### แบ่งงาน

| งาน | ผู้รับผิดชอบ |
|---|---|
| API สินค้า (6.3, 6.4) | |
| ลืมรหัสผ่านทางอีเมล (6.6.5) | |
| Frontend: Home + Contact | |
| Frontend: Admin + สินค้า | |
| Frontend: สมัครสมาชิก + Login | |
| Postman Collection | |
| แก้รายงาน + รูป ER | |

---

## เทคโนโลยี

| ส่วน | เครื่องมือ |
|---|---|
| Frontend | Vue.js (SPA), HTML5, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MySQL 8.0.16+ (หรือ MariaDB 10.2.1+) |
| Security | JWT, bcrypt |
| ทดสอบ API | Postman |
| อีเมลรีเซ็ตรหัสผ่าน | Nodemailer |
| ใบเสร็จ PDF (ส่วนที่ 2) | PDFKit |

## โครงสร้างโปรเจกต์

```
Probiotic_shop/
├── backend/
│   ├── src/
│   │   ├── config/db.js              เชื่อมต่อ MySQL
│   │   ├── middleware/auth.js        ตรวจ JWT และ role
│   │   ├── routes/auth.js            สมัครสมาชิก / Login / me
│   │   ├── scripts/create-admin.js   สร้าง Admin คนแรก
│   │   ├── utils/passwordPolicy.js   เงื่อนไขรหัสผ่าน
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── database/
│   └── probiotic_shop.sql            สร้างฐานข้อมูล + ข้อมูลตัวอย่าง
└── frontend/                         (ยังไม่เริ่ม)
```

## วิธีติดตั้งบนเครื่องตัวเอง

**ต้องมี:** Node.js 18 ขึ้นไป, MySQL (เช่น XAMPP) และ Git

```powershell
git clone https://github.com/weeradonwil/Probiotic_online.git
cd Probiotic_online\backend
npm install
copy .env.example .env
```

1. เปิด `.env` แล้วใส่ค่าของเครื่องตัวเอง (`DB_PASSWORD`) และสร้าง `JWT_SECRET` ด้วย
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. สร้างฐานข้อมูล: import `database/probiotic_shop.sql` ใน phpMyAdmin
   (ไฟล์นี้มี `DROP DATABASE` ที่ต้นไฟล์ รันซ้ำแล้วข้อมูลเดิมหายหมด)
3. สร้าง Admin (เปลี่ยนรหัสเป็นของตัวเอง ห้ามเก็บในไฟล์):
   ```powershell
   $env:ADMIN_PASSWORD='ตั้งรหัสที่ผ่านเงื่อนไข'; npm run create-admin
   Remove-Item Env:ADMIN_PASSWORD
   ```
4. รันเซิร์ฟเวอร์ `npm run dev` แล้วเปิด http://localhost:3000/api/health
   ต้องได้ `{"status":"ok","database":"connected"}`

> **ห้ามอัปโหลดไฟล์ `.env` ขึ้น GitHub** (มีรหัสผ่านและ secret) ทุกคนสร้าง `.env` ของตัวเอง

## API ที่ใช้ได้ตอนนี้

| Method | Endpoint | สิทธิ์ | หน้าที่ |
|---|---|---|---|
| GET | `/api/health` | ทุกคน | ตรวจสถานะเซิร์ฟเวอร์และฐานข้อมูล |
| POST | `/api/auth/register` | ทุกคน | สมัครสมาชิก (ได้ role = Customer เสมอ) |
| POST | `/api/auth/login` | ทุกคน | เข้าสู่ระบบ ได้ JWT token |
| GET | `/api/auth/me` | ต้องมี token | ดูข้อมูลของตัวเอง |
| GET | `/api/admin/ping` | Admin เท่านั้น | ทดสอบแยกสิทธิ์ (ชั่วคราว) |

ส่ง token ด้วย header: `Authorization: Bearer <token>`

## วิธีทำงานร่วมกันบน Git

1. **ก่อนเริ่มงานทุกครั้ง:** `git pull`
2. แบ่งไฟล์กันทำ อย่าแก้ไฟล์เดียวกันพร้อมกัน
3. commit ทีละงานเล็ก ๆ แล้ว `git push` บ่อย ๆ
4. ถ้า push แล้วขึ้น `rejected` แปลว่ามีคน push ก่อน ให้ `git pull` แล้ว push ใหม่
5. ห้าม commit: `.env`, `node_modules/`, `uploads/`
