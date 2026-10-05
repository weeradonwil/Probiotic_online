<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthPanel from '../components/AuthPanel.vue'
import PasswordInput from '../components/PasswordInput.vue'
import PasswordRules from '../components/PasswordRules.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api'
import { auth } from '../auth'

const route = useRoute()
const router = useRouter()
// เก็บ token ในหน่วยความจำเท่านั้น ไม่เขียนลง storage หรือ log
const token = typeof route.query.token === 'string' ? route.query.token : ''
const password = ref(''), confirm = ref('')
const checking = ref(true), valid = ref(false), loading = ref(false)
const linkError = ref(''), errors = ref([]), success = ref('')
const retryable = ref(false)

async function checkLink() {
  checking.value = true; linkError.value = ''; retryable.value = false
  if (!/^[a-f0-9]{64}$/.test(token)) {
    linkError.value = 'ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ตั้งรหัสผ่านใหม่'
    checking.value = false
    return
  }
  try {
    await api('/auth/reset-password/validate', { method: 'POST', authenticated: false, body: { token } })
    valid.value = true
  } catch (e) {
    linkError.value = e.message
    retryable.value = !e.status || e.status >= 500
  } finally { checking.value = false }
}

onMounted(async () => {
  // นำ token ออกจากแถบ URL/รายการประวัติหน้าปัจจุบันก่อนเรียก API เพื่อลดการเผยแพร่ลิงก์โดยไม่ตั้งใจ
  await router.replace({ path: '/reset-password' })
  await checkLink()
})

async function submit() {
  if (loading.value || !valid.value) return
  errors.value = []
  if (password.value !== confirm.value) { errors.value = ['รหัสผ่านทั้งสองช่องไม่ตรงกัน']; return }
  loading.value = true
  try {
    const result = await api('/auth/reset-password', {
      method: 'POST', authenticated: false,
      body: { token, password: password.value, password_confirm: confirm.value },
    })
    auth.clearSession()
    password.value = ''; confirm.value = ''; valid.value = false
    success.value = result.message
  } catch (e) { errors.value = e.errors?.length ? e.errors : [e.message] }
  finally { loading.value = false }
}
</script>

<template>
  <AuthPanel title="ตั้งรหัสผ่านใหม่" subtitle="กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ">
    <p v-if="checking" class="notice" role="status">กำลังตรวจสอบลิงก์...</p>
    <div v-else-if="success" class="form-stack">
      <p class="success-box" role="status">{{ success }}</p>
      <RouterLink to="/login" class="button button-primary">เข้าสู่ระบบ <Icon name="arrow" /></RouterLink>
    </div>
    <div v-else-if="!valid" class="form-stack">
      <p class="error-box" role="alert">{{ linkError }}</p>
      <button v-if="retryable" class="button button-outline" @click="checkLink">ลองตรวจสอบอีกครั้ง</button>
      <RouterLink to="/forgot-password" class="button button-primary">ขอลิงก์ใหม่ <Icon name="arrow" /></RouterLink>
    </div>
    <form v-else class="form-stack" :aria-busy="loading" @submit.prevent="submit">
      <ul v-if="errors.length" class="error-box" role="alert"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
      <PasswordInput id="reset-password" v-model="password" label="รหัสผ่านใหม่" />
      <PasswordInput id="reset-confirm" v-model="confirm" label="ยืนยันรหัสผ่านใหม่" />
      <PasswordRules :password="password" />
      <p v-if="confirm && password !== confirm" class="error-box">รหัสผ่านทั้งสองช่องไม่ตรงกัน</p>
      <button class="button button-primary" :disabled="loading">{{ loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่' }} <Icon name="arrow" /></button>
      <RouterLink to="/forgot-password" class="text-link">ลิงก์หมดอายุ? ขอลิงก์ใหม่ →</RouterLink>
    </form>
    <RouterLink v-if="!success" to="/login" class="text-link auth-bottom">กลับไปเข้าสู่ระบบ →</RouterLink>
  </AuthPanel>
</template>
