<script setup>
import { auth } from '../auth'
</script>

<template>
  <section class="rounded-2xl bg-emerald-50 px-8 py-16 text-center">
    <h1 class="text-4xl font-bold text-emerald-800">จุลินทรีย์ดี เพื่อสุขภาพลำไส้ที่ดี</h1>
    <p class="mt-4 text-gray-600">โปรไบโอติกแบบแคปซูล ผง เครื่องดื่ม และพรีไบโอติก ครบในที่เดียว</p>
    <RouterLink
      :to="auth.token ? '/products' : '/register'"
      class="mt-8 inline-block rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
    >
      {{ auth.token ? 'ดูสินค้าทั้งหมด' : 'สมัครสมาชิกเพื่อดูสินค้า' }}
    </RouterLink>
  </section>
</template>