<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'
const props = defineProps({ password: { type: String, default: '' } })
// กฎตรงกับ backend รวมถึงเพดาน 72 ไบต์ของ bcrypt เพื่อให้คำแนะนำก่อนส่งฟอร์มถูกต้อง
const rules = computed(() => [
  ['อย่างน้อย 8 ตัวอักษร', props.password.length >= 8],
  ['ตัวพิมพ์ใหญ่และเล็ก', /[A-Z]/.test(props.password) && /[a-z]/.test(props.password)],
  ['ตัวเลขและอักขระพิเศษ', /[0-9]/.test(props.password) && /[^A-Za-z0-9]/.test(props.password)],
  ['ไม่มีช่องว่าง / ไม่เกิน 72 ไบต์', !/\s/.test(props.password) && new TextEncoder().encode(props.password).length <= 72 && props.password.length > 0],
])
</script>
<template><div class="password-rules"><strong>รหัสผ่านต้องประกอบด้วย</strong><ul><li v-for="[label, passed] in rules" :key="label" :class="{ passed }"><Icon name="check" :size="15" />{{ label }}</li></ul></div></template>
