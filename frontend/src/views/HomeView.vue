<script setup>
import { onMounted, ref } from 'vue'
import Icon from '../components/Icon.vue'
import ProductCard from '../components/ProductCard.vue'
import { api } from '../api'
const categories = ref([])
const products = ref([])
const loading = ref(true)
const error = ref('')
// ข้อมูลหน้าแรกอ่านจาก API สาธารณะ ไม่ใช้ข้อมูลตัวอย่างจากภาพออกแบบแทนฐานข้อมูลจริง
onMounted(async () => {
  try { const [c, p] = await Promise.all([api('/categories'), api('/products?limit=4')]); categories.value = c.data; products.value = p.data }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
})
</script>
<template>
  <section class="home-hero"><div class="page-shell hero-copy"><span class="eyebrow">GOOD BACTERIA · BETTER LIFE</span><h1>โปรไบโอติก<br />เพื่อสุขภาพที่ดีทุกวัน</h1><p>เลือกสิ่งดี ๆ ให้กิจวัตรที่คุณใส่ใจ</p><RouterLink to="/products" class="button button-primary">เลือกชมสินค้า <Icon name="arrow" /></RouterLink><div class="hero-promises"><span><Icon name="shield" />ข้อมูลชัดเจน</span><span><Icon name="search" />ค้นหาได้สะดวก</span></div></div></section>
  <section class="category-band"><div class="page-shell category-section"><div><h2>เลือกดูสินค้า<brตามหมวดหมู่</h2></div><div class="category-grid"><RouterLink v-for="c in categories" :key="c.category_id" :to="{ path: '/products', query: { category_id: c.category_id } }" class="category-card"><span class="circle-icon"><Icon name="leaf" :size="29" /></span><strong>{{ c.name }}</strong><Icon name="arrow" :size="17" /></RouterLink><p v-if="loading">กำลังโหลดหมวดหมู่...</p></div></div></section>
  <section class="page-shell section"><div class="section-heading"><div><h2>สินค้าแนะนำ</h2><p>เลือกชมข้อมูล ราคา และจำนวนสินค้าจากร้าน</p></div><RouterLink to="/products" class="button button-outline">ดูสินค้าทั้งหมด <Icon name="arrow" :size="18" /></RouterLink></div>
    <p v-if="error" class="error-box" role="alert">{{ error }} <button class="text-link" @click="$router.go(0)">ลองอีกครั้ง</button></p>
    <div v-else-if="loading" class="product-grid"><div v-for="n in 4" :key="n" class="skeleton-card" aria-label="กำลังโหลดสินค้า"></div></div>
    <div v-else-if="products.length" class="product-grid"><ProductCard v-for="product in products" :key="product.product_id" :product="product" /></div>
    <p v-else class="empty-state">ยังไม่มีสินค้าในร้าน</p>
  </section>
</template>
