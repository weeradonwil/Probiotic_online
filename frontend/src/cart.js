import { reactive } from 'vue'
let saved = []
try { saved = JSON.parse(localStorage.getItem('probiotic-cart') || '[]') } catch { /* ข้อมูลเก่าเสียหายให้เริ่มตะกร้าว่าง */ }
// ตะกร้าเป็นรายการที่เลือกใน browser เท่านั้น ยังไม่ใช่ order และราคาไม่ใช่ยอดยืนยันจาก server
export const cart = reactive({
  items: Array.isArray(saved) ? saved.filter(item => item?.product_id && Number.isInteger(item.quantity) && item.quantity > 0) : [],
  notice: '',
  get count() { return this.items.reduce((sum, item) => sum + item.quantity, 0) },
  get total() { return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0) },
  save() { localStorage.setItem('probiotic-cart', JSON.stringify(this.items)) },
  add(product) {
    const existing = this.items.find(item => item.product_id === product.product_id)
    if ((existing?.quantity || 0) >= product.stock) { this.notice = 'เลือกครบจำนวนสินค้าที่มีแล้ว'; return }
    if (existing) existing.quantity++
    else this.items.push({ ...product, quantity: 1 })
    this.save()
    this.notice = 'เพิ่ม ' + product.name + ' ลงตะกร้าแล้ว'
  },
  update(id, value) {
    const item = this.items.find(item => item.product_id === id)
    if (item) item.quantity = Math.min(item.stock, Math.max(1, Math.floor(Number(value) || 1)))
    this.save()
  },
  remove(id) { this.items = this.items.filter(item => item.product_id !== id); this.save() },
})
