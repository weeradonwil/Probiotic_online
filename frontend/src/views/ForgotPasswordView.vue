<script setup>
import { ref } from 'vue'
import AuthPanel from '../components/AuthPanel.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api'

const email = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

async function submit() {
  if (loading.value) return
  message.value = ''; error.value = ''; loading.value = true
  try {
    // ไม่แนบ JWT: สมาชิกที่ลืมรหัสผ่านต้องขอลิงก์ได้แม้ยังไม่ได้เข้าสู่ระบบ
    const result = await api('/auth/forgot-password', {
      method: 'POST', authenticated: false, body: { email: email.value.trim() },
    })
    message.value = result.message
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
</script>

<template>
  <AuthPanel compact title="ลืมรหัสผ่าน?" subtitle="กรอกอีเมลที่ใช้สมัครสมาชิกเพื่อขอลิงก์ตั้งรหัสผ่านใหม่">
    <div class="auth-symbol"><Icon name="mail" :size="48" /></div>
    <form class="form-stack" :aria-busy="loading" @submit.prevent="submit">
      <p v-if="message" class="success-box" role="status">{{ message }}</p>
      <p v-if="error" class="error-box" role="alert">{{ error }}</p>
      <label for="forgot-email">Email
        <input id="forgot-email" v-model="email" type="email" required maxlength="100" autocomplete="email" placeholder="Email ที่ใช้สมัครสมาชิก" :disabled="loading" />
      </label>
      <p class="field-help">ลิงก์ใช้ได้ครั้งเดียวภายใน 15 นาที หากขอลิงก์ใหม่ ให้ใช้ลิงก์จากอีเมลล่าสุด</p>
      <button class="button button-primary" :disabled="loading">
        {{ loading ? 'กำลังขอลิงก์...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน' }} <Icon name="arrow" />
      </button>
      <p class="auth-bottom"><RouterLink to="/login" class="text-link">กลับไปหน้าเข้าสู่ระบบ →</RouterLink></p>
    </form>
  </AuthPanel>
</template>
