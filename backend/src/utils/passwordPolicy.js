// เงื่อนไข Password (ข้อ 6.6.6 / FR-06)
const MIN_LENGTH = 8;
const MAX_LENGTH = 72; // bcrypt ใช้เพียง 72 ไบต์แรก

function validatePassword(password) {
  const errors = [];
  if (typeof password !== 'string') return ['รหัสผ่านไม่ถูกต้อง'];

  if (password.length < MIN_LENGTH) errors.push(`ต้องมีอย่างน้อย ${MIN_LENGTH} ตัวอักษร`);
  if (Buffer.byteLength(password, 'utf8') > MAX_LENGTH) errors.push(`ต้องไม่เกิน ${MAX_LENGTH} ไบต์`);
  if (!/[a-z]/.test(password)) errors.push('ต้องมีตัวพิมพ์เล็ก (a-z)');
  if (!/[A-Z]/.test(password)) errors.push('ต้องมีตัวพิมพ์ใหญ่ (A-Z)');
  if (!/[0-9]/.test(password)) errors.push('ต้องมีตัวเลข (0-9)');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('ต้องมีอักขระพิเศษ เช่น ! @ # $ %');
  if (/\s/.test(password)) errors.push('ห้ามมีช่องว่าง');

  return errors;
}

module.exports = { validatePassword, MIN_LENGTH, MAX_LENGTH };