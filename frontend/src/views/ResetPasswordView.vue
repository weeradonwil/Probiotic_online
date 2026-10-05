<script setup>
import { ref } from 'vue'
import AuthPanel from '../components/AuthPanel.vue'
import PasswordInput from '../components/PasswordInput.vue'
import PasswordRules from '../components/PasswordRules.vue'
import Icon from '../components/Icon.vue'
const password = ref(''), confirm = ref('')
// UI แยกจาก backend reset token ซึ่งยังไม่มี API จึงไม่จำลองว่าบันทึกรหัสผ่านสำเร็จ
</script>
<template><AuthPanel title="ตั้งรหัสผ่านใหม่" subtitle="กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ"><form class="form-stack" @submit.prevent><p class="notice" role="status">บริการตั้งรหัสผ่านใหม่ยังไม่เปิดให้บริการ</p><PasswordInput id="reset-password" v-model="password" label="รหัสผ่านใหม่" /><PasswordInput id="reset-confirm" v-model="confirm" label="ยืนยันรหัสผ่านใหม่" /><PasswordRules :password="password" /><p v-if="confirm && password !== confirm" class="error-box">รหัสผ่านทั้งสองช่องไม่ตรงกัน</p><button class="button button-primary" disabled>บันทึกรหัสผ่านใหม่ <Icon name="arrow" /></button><RouterLink to="/login" class="text-link auth-bottom">กลับไปเข้าสู่ระบบ →</RouterLink></form></AuthPanel></template>
