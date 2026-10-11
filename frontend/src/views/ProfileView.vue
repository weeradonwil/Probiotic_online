<script setup>
import { ref, onMounted } from 'vue'
import PageBanner from '../components/PageBanner.vue'
import { auth } from '../auth'

const fullName = ref('')
const newPassword = ref('')
const isSubmitting = ref(false)
const message = ref('')
const errorMessage = ref('')

onMounted(() => {
  if (auth.user) {
    fullName.value = auth.user.full_name || ''
  }
})

const updateProfile = async () => {
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const res = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        full_name: fullName.value,
        password: newPassword.value || undefined
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    message.value = data.message
    newPassword.value = ''
    
    if (data.user) {
      auth.user = data.user
      localStorage.setItem('probiotic-user', JSON.stringify(data.user))
    }
  } catch (err) {
    errorMessage.value = err.message || 'บันทึกข้อมูลไม่สำเร็จ'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <PageBanner title="แก้ไขข้อมูลโปรไฟล์" subtitle="จัดการข้อมูลส่วนตัวและรหัสผ่านของคุณ" />

  <section class="page-shell section">
    <div class="panel" style="max-width: 520px; margin: 0 auto;">
      <h2 style="margin-top: 0; margin-bottom: 1.25rem;">ข้อมูลบัญชีผู้ใช้</h2>

      <p v-if="message" style="color: #059669; background: #ecfdf5; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
        {{ message }}
      </p>
      <p v-if="errorMessage" style="color: #dc2626; background: #fef2f2; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
        {{ errorMessage }}
      </p>

      <form @submit.prevent="updateProfile" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div>
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">ชื่อผู้ใช้ (Username)</label>
          <input type="text" :value="auth.user?.username" disabled style="width: 100%; padding: 0.5rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; color: #6b7280;" />
          <small style="color: #9ca3af;">ไม่สามารถแก้ไขชื่อผู้ใช้ได้</small>
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">อีเมล (Email)</label>
          <input type="email" :value="auth.user?.email" disabled style="width: 100%; padding: 0.5rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; color: #6b7280;" />
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">ชื่อ-นามสกุล *</label>
          <input v-model="fullName" type="text" required placeholder="กรอกชื่อและนามสกุล" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;" />
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">รหัสผ่านใหม่</label>
          <input v-model="newPassword" type="password" placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;" />
        </div>

        <button type="submit" class="button button-primary" :disabled="isSubmitting" style="margin-top: 0.5rem;">
          {{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
        </button>
      </form>
    </div>
  </section>
</template>