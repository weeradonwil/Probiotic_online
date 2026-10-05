<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthPanel from '../components/AuthPanel.vue'
import PasswordInput from '../components/PasswordInput.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api'
import { auth } from '../auth'
const route = useRoute()
const router = useRouter()
const form = ref({ username: '', password: '' })
const remember = ref(false)
const error = ref('')
const loading = ref(false)
async function submit() {
  error.value = ''; loading.value = true
  try {
    const data = await api('/auth/login', { method: 'POST', body: form.value })
    auth.setSession(data.token, data.user, remember.value)
    // รับ redirect เฉพาะเส้นทางภายใน และแยก landing page ของ Admin จากลูกค้า
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : data.user.role === 'Admin' ? '/admin' : '/products'
    await router.push(redirect)
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
</script>
<template><AuthPanel title="เข้าสู่ระบบ" subtitle="เข้าสู่บัญชีของคุณเพื่อดำเนินการต่อ"><form class="form-stack" @submit.prevent="submit"><p v-if="route.query.registered" class="success-box" role="status">สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ</p><p v-if="error" class="error-box" role="alert">{{ error }}</p><label class="field-label" for="login-user">ชื่อผู้ใช้งาน</label><div class="input-icon"><Icon name="user" /><input id="login-user" v-model="form.username" required autocomplete="username" placeholder="ชื่อผู้ใช้งาน" /></div><PasswordInput id="login-password" v-model="form.password" label="รหัสผ่าน" autocomplete="current-password" /><div class="form-between"><label class="check-label"><input v-model="remember" type="checkbox" />จดจำฉัน</label><RouterLink to="/forgot-password" class="text-link">ลืมรหัสผ่าน?</RouterLink></div><button :disabled="loading" class="button button-primary">{{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}<Icon name="arrow" /></button><p class="auth-bottom">ยังไม่มีบัญชี? <RouterLink to="/register" class="text-link">สมัครสมาชิก →</RouterLink></p></form></AuthPanel></template>
