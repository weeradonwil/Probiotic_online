<script setup>
import Brand from './Brand.vue'
defineProps({
  title: String,
  subtitle: String,
  compact: Boolean,
  variant: { type: String, default: 'login' }
})
</script>
<template><section class="auth-page"><div :class="['auth-panel', { compact }]">
  <aside v-if="!compact" :class="['auth-art', `auth-art-${variant}`]">
    <Brand />
    <div class="auth-art-copy">
      <span class="auth-art-kicker">{{ variant === 'register' ? 'เริ่มต้นดูแลสุขภาพวันนี้' : 'สุขภาพดี เริ่มจากภายใน' }}</span>
      <h2 v-if="variant === 'register'">สุขภาพดี<br />เริ่มได้จากทุกวัน</h2>
      <h2 v-else class="auth-login-heading"><span>สมดุลจากภายใน</span><span>เพื่อสุขภาพที่ดีกว่า</span></h2>
      <p v-if="variant === 'register'">
        เติมสมดุลให้ลำไส้ <br /> ด้วยโพรไบโอติกที่คุณวางใจ
      </p>
    </div>
    <span class="auth-art-caption">PROBIOTIC • DAILY WELLNESS</span>
  </aside>
  <div class="auth-form"><Brand v-if="compact" /><header><h1>{{ title }}</h1><p>{{ subtitle }}</p></header><slot /></div>
</div></section></template>
