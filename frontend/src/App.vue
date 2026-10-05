<script setup>
import { auth } from './auth'
</script>

<template>
  <header class="bg-emerald-700 text-white">
    <nav class="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
      <RouterLink to="/" class="text-lg font-bold">🌿 Probiotic Shop</RouterLink>
      <RouterLink to="/" class="hover:underline">หน้าแรก</RouterLink>
      <RouterLink v-if="auth.token" to="/products" class="hover:underline">สินค้า</RouterLink>
      <div class="ml-auto flex items-center gap-4">
        <template v-if="auth.token">
          <span class="text-sm">{{ auth.user.full_name || auth.user.username }} ({{ auth.user.role }})</span>
          <button class="rounded bg-white/20 px-3 py-1 hover:bg-white/30" @click="auth.logout()">ออกจากระบบ</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="hover:underline">เข้าสู่ระบบ</RouterLink>
          <RouterLink to="/register" class="rounded bg-white px-3 py-1 text-emerald-800">สมัครสมาชิก</RouterLink>
        </template>
      </div>
    </nav>
  </header>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <RouterView />
  </main>
</template>