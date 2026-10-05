<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageBanner from '../components/PageBanner.vue'
import ProductCard from '../components/ProductCard.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api'
const route = useRoute(), router = useRouter()
const products = ref([]), categories = ref([]), error = ref(''), loading = ref(true), total = ref(0)
const query = ref(String(route.query.q || '')), category = ref(String(route.query.category_id || '')), sort = ref('default'), page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(total.value / 8)))
let timer, requestNumber = 0
// หมายเลข request ป้องกันผลค้นหาเก่าที่ตอบช้ากว่าเขียนทับผลล่าสุด
async function load() {
  const current = ++requestNumber
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ limit: 8, page: page.value, sort: sort.value })
    if (query.value.trim()) params.set('q', query.value.trim())
    if (category.value) params.set('category_id', category.value)
    const result = await api('/products?' + params)
    if (current === requestNumber) { products.value = result.data; total.value = result.total }
  } catch (e) { if (current === requestNumber) error.value = e.message }
  finally { if (current === requestNumber) loading.value = false }
}
function applyFilters() {
  page.value = 1
  const params = {}
  if (query.value.trim()) params.q = query.value.trim()
  if (category.value) params.category_id = category.value
  router.replace({ query: params })
  load()
}
watch(query, () => { clearTimeout(timer); timer = setTimeout(applyFilters, 300) })
watch([category, sort], applyFilters)
watch(() => route.query, (params) => {
  if (String(params.q || '') !== query.value) query.value = String(params.q || '')
  if (String(params.category_id || '') !== category.value) category.value = String(params.category_id || '')
})
function changePage(value) { page.value = value; load() }
onMounted(async () => {
  try { categories.value = (await api('/categories')).data } catch (e) { error.value = e.message }
  await load()
})
onBeforeUnmount(() => { clearTimeout(timer); requestNumber++ })
</script>
<template><PageBanner title="ผลิตภัณฑ์ของเรา" subtitle="เลือกผลิตภัณฑ์ที่เหมาะกับความต้องการของคุณ" /><section class="page-shell section catalog">
  <div class="catalog-toolbar"><div class="input-icon search-field"><Icon name="search" /><input v-model="query" type="search" placeholder="ค้นหาสินค้า..." aria-label="ค้นหาสินค้า" /></div><div class="filter-list"><button :class="['filter-chip', { active: !category }]" @click="category = ''">สินค้าทั้งหมด</button><button v-for="c in categories" :key="c.category_id" :class="['filter-chip', { active: category === String(c.category_id) }]" @click="category = String(c.category_id)">{{ c.name }}</button></div><select v-model="sort" aria-label="เรียงสินค้า"><option value="default">เรียงตามลำดับ</option><option value="price_asc">ราคาต่ำไปสูง</option><option value="price_desc">ราคาสูงไปต่ำ</option><option value="newest">เพิ่มล่าสุด</option></select></div>
  <div class="catalog-summary"><span>{{ total }} รายการ</span></div>
  <p v-if="error" class="error-box" role="alert">{{ error }} <button class="text-link" @click="load">ลองอีกครั้ง</button></p>
  <div v-else-if="loading" class="product-grid"><div v-for="n in 8" :key="n" class="skeleton-card" aria-label="กำลังโหลดสินค้า"></div></div>
  <p v-else-if="!products.length" class="empty-state">ไม่พบสินค้าที่ตรงกับคำค้นหา</p>
  <div v-else class="product-grid"><ProductCard v-for="p in products" :key="p.product_id" :product="p" /></div>
  <nav v-if="pages > 1" class="pagination" aria-label="แบ่งหน้าสินค้า"><button :disabled="page === 1" @click="changePage(page - 1)" aria-label="หน้าก่อนหน้า">‹</button><span>หน้า {{ page }} / {{ pages }}</span><button :disabled="page === pages" @click="changePage(page + 1)" aria-label="หน้าถัดไป">›</button></nav>
</section></template>
