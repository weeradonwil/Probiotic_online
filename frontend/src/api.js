import { auth } from './auth'

// เรียก backend พร้อมแนบ JWT อัตโนมัติ  ใช้: await api('/products?q=abc')
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))

  // token หมดอายุหรือไม่ถูกต้อง -> ล้าง session แล้วไปหน้า login
  if (res.status === 401 && auth.token) auth.logout()

  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'เกิดข้อผิดพลาด'), {
      errors: data.errors,
      status: res.status,
    })
  }
  return data
}