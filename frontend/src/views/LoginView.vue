<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../api'
import { auth } from '../auth'

const router = useRouter()
const route = useRoute()
const form = ref({ username: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const data = await api('/auth/login', { method: 'POST', body: form.value })
    auth.setSession(data.token, data.user)
    router.push(route.query.redirect || '/products')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="mx-auto max-w-sm space-y-4 rounded-xl border p-6" @submit.prevent="submit">
    <h1 class="text-2xl font-bold">เข้าสู่ระบบ</h1>
    <p v-if="error" class="rounded bg-red-50 p-2 text-sm text-red-700">{{ error }}</p>
    <input v-model="form.username" required placeholder="Username" autocomplete="username" class="w-full rounded border px-3 py-2" />
    <input v-model="form.password" required type="password" placeholder="Password" autocomplete="current-password" class="w-full rounded border px-3 py-2" />
    <button :disabled="loading" class="w-full rounded bg-emerald-700 py-2 font-semibold text-white disabled:opacity-50">
      {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
    </button>
    <p class="text-center text-sm">ยังไม่มีบัญชี? <RouterLink to="/register" class="text-emerald-700 underline">สมัครสมาชิก</RouterLink></p>
  </form>
</template>