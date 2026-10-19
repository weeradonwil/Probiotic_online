<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthPanel from '../components/AuthPanel.vue'
import PasswordInput from '../components/PasswordInput.vue'
import PasswordRules from '../components/PasswordRules.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api'
const router = useRouter()
const form = ref({ username: '', email: '', full_name: '', password: '' })
const confirm = ref('')
const errors = ref([])
const loading = ref(false)
async function submit() {
  errors.value = []
  // ยืนยันรหัสผ่านตรวจที่ UI ส่วนกฎความปลอดภัย backend ตรวจซ้ำทุกครั้ง
  if (form.value.password !== confirm.value) { errors.value = ['รหัสผ่านทั้งสองช่องไม่ตรงกัน']; return }
  loading.value = true
  try { await api('/auth/register', { method: 'POST', body: form.value }); router.push('/login?registered=1') }
  catch (e) { errors.value = e.errors?.length ? e.errors : [e.message] }
  finally { loading.value = false }
}
</script>
<template><AuthPanel title="สมัครสมาชิก" subtitle="สร้างบัญชีของคุณกับ Probiotic Shop" variant="register"><form class="form-stack register-form" @submit.prevent="submit"><ul v-if="errors.length" class="error-box" role="alert"><li v-for="message in errors" :key="message">{{ message }}</li></ul><label for="full-name">ชื่อ–นามสกุล<input id="full-name" v-model="form.full_name" maxlength="100" autocomplete="name" placeholder="ชื่อ–นามสกุล" /></label><label for="register-user">Username<input id="register-user" v-model="form.username" required minlength="3" maxlength="50" pattern="[A-Za-z0-9_]{3,50}" autocomplete="username" placeholder="Username (ตัวอักษร ตัวเลข หรือ _ )" /></label><label for="register-email">Email<input id="register-email" v-model="form.email" required type="email" maxlength="100" autocomplete="email" placeholder="Email" /></label><PasswordInput id="register-password" v-model="form.password" label="รหัสผ่าน" /><PasswordRules :password="form.password" /><PasswordInput id="confirm-password" v-model="confirm" label="ยืนยันรหัสผ่าน" /><button :disabled="loading" class="button button-primary">{{ loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก' }}<Icon name="arrow" /></button><p class="auth-bottom">มีบัญชีอยู่แล้ว? <RouterLink to="/login" class="text-link">เข้าสู่ระบบ →</RouterLink></p></form></AuthPanel></template>
