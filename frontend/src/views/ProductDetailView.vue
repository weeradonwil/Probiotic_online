<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageBanner from '../components/PageBanner.vue'
import ProductImage from '../components/ProductImage.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api'
import { cart } from '../cart'
import { money } from '../format'
const route = useRoute(), product = ref(null), error = ref(''), loading = ref(true)
// ดึงรายละเอียดจาก server ทุกครั้งที่เปลี่ยนรหัสสินค้า
watch(() => route.params.id, async (id) => {
  loading.value = true; error.value = ''
  try { product.value = (await api('/products/' + encodeURIComponent(id))).data }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
}, { immediate: true })
</script>
<template><PageBanner title="รายละเอียดสินค้า" subtitle="เลือกสิ่งดี ๆ ให้ทุกวันของคุณ" /><section class="page-shell section"><p v-if="loading" class="empty-state">กำลังโหลดรายละเอียด...</p><p v-else-if="error" class="error-box" role="alert">{{ error }}</p><div v-else-if="product" class="panel detail-grid"><ProductImage :product="product" /><div><span class="product-category">{{ product.category_name }}</span><h1>{{ product.name }}</h1><p>{{ product.description }}</p><strong class="product-price">{{ money(product.price) }}</strong><p :class="['stock-label', { 'stock-out': !product.stock }]">{{ product.stock ? 'คงเหลือ ' + product.stock + ' ชิ้น' : 'สินค้าหมด' }}</p><button class="button button-primary" :disabled="!product.stock" @click="cart.add(product)"><Icon name="cart" />เพิ่มลงตะกร้า</button><RouterLink to="/products" class="text-link detail-back">กลับไปเลือกสินค้า →</RouterLink></div></div></section></template>
