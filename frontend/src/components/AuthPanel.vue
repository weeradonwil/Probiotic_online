<script setup>
import Brand from './Brand.vue'
defineProps({ title: String, subtitle: String, compact: Boolean })
</script>
<template><section class="auth-page"><div :class="['auth-panel', { compact }]">
  <aside v-if="!compact" class="auth-art"><Brand /><h2>ดูแลสุขภาพจากภายใน<br />เริ่มต้นง่าย ๆ ในทุกวัน</h2><p>Healthy Gut, Happier You</p></aside>
  <div class="auth-form"><Brand v-if="compact" /><header><h1>{{ title }}</h1><p>{{ subtitle }}</p></header><slot /></div>
</div></section></template>
