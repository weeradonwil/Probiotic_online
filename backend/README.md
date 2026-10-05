# Backend: การรีเซ็ตรหัสผ่านทางอีเมล

## ตั้งค่าและเริ่มใช้งาน

1. ติดตั้ง dependencies ในโฟลเดอร์ `backend` ด้วย `npm.cmd install`
2. ตั้งค่า DB และ JWT ใน `.env` ตาม `.env.example`
3. เพิ่มค่าผู้ส่งอีเมลใน `.env`:

   ```env
   FRONTEND_URL=http://localhost:5173
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-shop@gmail.com
   SMTP_PASS=your-app-password-without-spaces
   ```

4. Gmail ต้องเปิดการยืนยันแบบ 2 ขั้นตอนและใช้ App Password ของบัญชีผู้ส่ง หากรหัสเปิดเผย ให้เพิกถอนแล้วสร้างใหม่ ไม่ใส่รหัสผ่าน Gmail ปกติ
5. รัน `npm.cmd run migrate:password-reset` เพื่อเพิ่มคอลัมน์ที่ขาด รันซ้ำได้และไม่ลบบัญชีเดิม
6. รัน `npm.cmd run check-mail` เพื่อตรวจ SMTP โดยไม่ส่งอีเมลและไม่แสดง credentials
7. รันหรือรีสตาร์ต backend ด้วย `npm.cmd run dev` และ frontend ด้วย `npm.cmd run dev` ในโฟลเดอร์ `frontend`
8. เปิด `/forgot-password` กรอกอีเมลสมาชิก แล้วเปิดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่

ไฟล์ `.env` ถูก Git ignore อยู่แล้ว ห้ามคัดลอกข้อมูลลับไปใส่ `.env.example` หรือเอกสาร

`FRONTEND_URL` ต้องเป็น URL ของหน้าร้านที่ผู้รับเปิดได้ ไม่มี path/query/fragment ส่วน `localhost` ใช้ได้เฉพาะเครื่องที่รันเว็บอยู่ เมื่อ deploy ให้ใช้โดเมน HTTPS ของร้านและตั้ง `NODE_ENV=production`

## API

ทุก endpoint ต่อไปนี้เป็นสาธารณะ ไม่ต้องมี JWT แต่มี rate limit และใช้ `Cache-Control: no-store`

| Method | Endpoint | Request body | ผลลัพธ์ |
|---|---|---|---|
| POST | `/api/auth/forgot-password` | `{ "email": "member@example.com" }` | `202` รับคำขอ ข้อความเหมือนกันทั้งบัญชีที่มีและไม่มี |
| POST | `/api/auth/reset-password/validate` | `{ "token": "..." }` | `200` ลิงก์ใช้ได้ หรือ `400` ไม่ถูกต้อง/หมดอายุ/ใช้แล้ว |
| POST | `/api/auth/reset-password` | `{ "token": "...", "password": "...", "password_confirm": "..." }` | `200` ตั้งรหัสผ่านสำเร็จ หรือ `400` ข้อมูล/ลิงก์ไม่ถูกต้อง |

อีเมลผู้รับดึงจาก `accounts.email` ไม่อนุญาตให้ผู้เรียกเลือกอีเมลปลายทางอื่นสำหรับบัญชีที่รีเซ็ต

## พฤติกรรมและการป้องกัน

- สุ่ม token 32 bytes ด้วย `crypto.randomBytes` เก็บ SHA-256 ใน `accounts.reset_token_hash` และกำหนดอายุ 15 นาทีด้วยเวลาของ DB
- ขอลิงก์ใหม่แทนที่ลิงก์เดิม การขอลิงก์อย่างเดียวยังไม่เปลี่ยนรหัสผ่านหรือยกเลิก JWT
- ตรวจรหัสผ่านด้วย policy เดิมและ hash ด้วย bcrypt ก่อนบันทึก
- อัปเดตรหัสผ่าน ล้าง token และเพิ่ม `token_version` ใน SQL UPDATE เดียวที่ตรวจวันหมดอายุซ้ำ ป้องกันการใช้ token ซ้ำหรือส่งพร้อมกัน
- JWT ใหม่มี `token_version`; middleware ตรวจ version และ role กับบัญชีปัจจุบันทุกครั้ง บัญชีที่ลบแล้วและ JWT ก่อนรีเซ็ตเข้า API ที่ต้องล็อกอินไม่ได้
- JWT เก่าที่ไม่มี version ถือเป็น version 0 เพื่อรองรับ session เดิมก่อนรีเซ็ต
- ส่งอีเมลแจ้งหลังเปลี่ยนรหัสผ่านสำเร็จ ไม่ส่งรหัสผ่านในอีเมล และไม่เข้าสู่ระบบอัตโนมัติ
- จำกัดการขอลิงก์ 10 ครั้งต่อ IP/ชั่วโมง และ 3 ครั้งต่ออีเมล/ชั่วโมง รวมกรณีอีเมลไม่มีบัญชี
- จำกัดการตรวจลิงก์/ตั้งรหัสผ่านรวมกัน 20 ครั้งต่อ IP/15 นาที
- URL ของอีเมลใช้ `FRONTEND_URL` จาก config ไม่ใช้ Host header ของคำขอ
- Frontend เก็บ reset token ในหน่วยความจำ นำออกจาก URL ปัจจุบัน และใช้ referrer policy `no-referrer` หากรีเฟรชหน้าหลังนำ token ออก ให้เปิดลิงก์จากอีเมลอีกครั้ง
- Backend บันทึกเฉพาะรหัสข้อผิดพลาด ไม่บันทึก SMTP password, reset token หรือรหัสผ่านสมาชิก

## การส่งอีเมลและข้อจำกัด

`202` หมายถึงรับคำขอ ไม่ได้ยืนยันว่าอีเมลส่งถึงกล่องขาเข้าแล้ว งานค้นบัญชีและส่ง SMTP ทำหลังตอบคำขอ เพื่อลดการเปิดเผยว่ามีบัญชีนั้นอยู่จากเวลาตอบ หากส่งไม่สำเร็จ ระบบล้าง token ของคำขอนั้นและเขียนรหัสข้อผิดพลาดใน log

งานส่งอีเมลอยู่ในหน่วยความจำของ backend process หากรีสตาร์ตหรือ process หยุดก่อนส่ง ผู้ใช้ต้องขอลิงก์ใหม่ ยังไม่มี durable queue หรือ retry อัตโนมัติ และ rate limit เก็บใน process เดียว ควรเพิ่ม queue และ shared rate-limit store เมื่อขยายไปหลาย instance

หาก SMTP แจ้ง `EAUTH` ให้ตรวจบัญชีผู้ส่ง เปิดการยืนยัน 2 ขั้นตอน และสร้าง App Password ใหม่ จากนั้นบันทึก `.env` รีสตาร์ต backend และรัน `check-mail` อีกครั้ง ส่วน `ESOCKET` / `ETIMEDOUT` ให้ตรวจการเชื่อมต่อ SMTP

## การทดสอบ

```powershell
npm.cmd run test:password-reset
```

ต้องเชื่อม MySQL ได้ และรัน migration แล้ว ชุดทดสอบใช้ TEMPORARY TABLE `accounts` เฉพาะ connection ทดสอบ ไม่แก้บัญชีจริง และจำลองการส่งอีเมลโดยไม่ติดต่อ Gmail

ตรวจการ hash/อายุ token, ลิงก์ใหม่ยกเลิกลิงก์เก่า, token ผิด/หมดอายุ/ใช้ซ้ำ, policy รหัสผ่าน, การส่งคำขอพร้อมกัน, การยกเลิก JWT, การเข้าสู่ระบบด้วยรหัสผ่านใหม่, SMTP ล้มเหลว, rate limit และบัญชีที่ถูกลบ/เปลี่ยนสิทธิ์

การตรวจ SMTP ผ่านยืนยันเพียงการเชื่อมต่อและ authentication ยังต้องให้สมาชิกทดสอบรับอีเมลจริงและ flow บน browser เพิ่ม
