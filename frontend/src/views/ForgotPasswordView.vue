<script setup>
import AuthPanel from '../components/AuthPanel.vue'
import Icon from '../components/Icon.vue'
</script>
<template><AuthPanel compact title="ลืมรหัสผ่าน?" subtitle="กรอกอีเมลที่ใช้สมัครสมาชิกเพื่อขอลิงก์ตั้งรหัสผ่านใหม่"><div class="auth-symbol"><Icon name="mail" :size="48" /></div><form class="form-stack" @submit.prevent><p class="notice" role="status">บริการรีเซ็ตรหัสผ่านทางอีเมลยังไม่เปิดให้บริการ</p><label for="forgot-email">Email<input id="forgot-email" type="email" autocomplete="email" placeholder="Email ที่ใช้สมัครสมาชิก" /></label><button class="button button-primary" disabled>ส่งลิงก์รีเซ็ตรหัสผ่าน <Icon name="arrow" /></button><p class="auth-bottom"><RouterLink to="/login" class="text-link">กลับไปหน้าเข้าสู่ระบบ →</RouterLink></p></form></AuthPanel></template>
