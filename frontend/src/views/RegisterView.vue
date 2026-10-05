<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const router = useRouter()
const form = ref({ username: '', email: '', full_name: '', password: '' })
const errors = ref([])
const loading = ref(false)

async function submit() {
  errors.value = []
  loading.value = true
  try {
    await api('/auth/register', { method: 'POST', body: form.value })
    router.push('/login')
  } catch (e) {
    errors.value = e.errors?.length ? e.errors : [e.message]
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="mx-auto max-w-sm space-y-4 rounded-xl border p-6" @submit.prevent="submit">
    <h1 class="text-2xl font-bold">สมัครสมาชิก</h1>
    <ul v-if="errors.length" class="list-disc rounded bg-red-50 p-2 pl-6 text-sm text-red-700">
      <li v-for="m in errors" :key="m">{{ m }}</li>
    </ul>
    <input v-model="form.username" required placeholder="Username (a-z, 0-9, _ ยาว 3-50)" class="w-full rounded border px-3 py-2" />
    <input v-model="form.email" required type="email" placeholder="อีเมล" class="w-full rounded border px-3 py-2" />
    <input v-model="form.full_name" placeholder="ชื่อ-นามสกุล" class="w-full rounded border px-3 py-2" />
    <input v-model="form.password" required type="password" placeholder="Password" autocomplete="new-password" class="w-full rounded border px-3 py-2" />
    <p class="text-xs text-gray-500">รหัสผ่าน: อย่างน้อย 8 ตัว มีพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ ห้ามมีช่องว่าง</p>
    <button :disabled="loading" class="w-full rounded bg-emerald-700 py-2 font-semibold text-white disabled:opacity-50">
      {{ loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก' }}
    </button>
  </form>
</template>