import { reactive } from 'vue'

// จดจำฉันเก็บข้ามการเปิด browser; หากไม่เลือกใช้ sessionStorage เฉพาะ session ปัจจุบัน
let saved = null
try { saved = JSON.parse(localStorage.getItem('session') || sessionStorage.getItem('session') || 'null') } catch { /* session เก่าที่อ่านไม่ได้ไม่ควรทำให้เว็บเปิดไม่ได้ */ }
export const auth = reactive({
  token: saved?.token || null,
  user: saved?.user || null,
  get isAdmin() { return this.user?.role === 'Admin' },
  setSession(token, user, remember = false) {
    this.token = token; this.user = user
    localStorage.removeItem('session'); sessionStorage.removeItem('session')
    const storage = remember ? localStorage : sessionStorage
    storage.setItem('session', JSON.stringify({ token, user }))
  },
  logout() {
    this.token = null; this.user = null
    localStorage.removeItem('session'); sessionStorage.removeItem('session')
    location.href = '/login'
  },
})
