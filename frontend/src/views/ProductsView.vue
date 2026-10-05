<script setup>
import { ref, watch, onMounted } from 'vue'
import { api } from '../api'

const products = ref([])
const categories = ref([])
const q = ref('')
const categoryId = ref('')
const total = ref(0)
const error = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (q.value.trim()) params.set('q', q.value.trim())
    if (categoryId.value) params.set('category_id', categoryId.value)
    const res = await api('/products?' + params)
    products.value = res.data
    total.value = res.total
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

let timer
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 300) // รอผู้ใช้พิมพ์เสร็จก่อนค่อยค้นหา
})
watch(categoryId, load)

onMounted(async () => {
  categories.value = (await api('/categories')).data
  load()
})

const baht = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
</script>

<template>
  <h1 class="mb-4 text-2xl font-bold">สินค้าทั้งหมด</h1>

  <div class="mb-4 flex flex-wrap gap-3">
    <input v-model="q" placeholder="ค้นหาสินค้า..." class="w-64 rounded border px-3 py-2" />
    <div class="flex flex-wrap gap-2">
      <button
        v-for="c in [{ category_id: '', name: 'ทั้งหมด' }, ...categories]"
        :key="c.category_id"
        class="rounded-full border px-3 py-1 text-sm"
        :class="categoryId === c.category_id ? 'border-emerald-700 bg-emerald-700 text-white' : 'hover:bg-emerald-50'"
        @click="categoryId = c.category_id"
      >
        {{ c.name }}
      </button>
    </div>
  </div>

  <p v-if="error" class="rounded bg-red-50 p-3 text-red-700">{{ error }}</p>
  <p v-else-if="!loading && !products.length" class="text-gray-500">ไม่พบสินค้า</p>

  <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
    <article v-for="p in products" :key="p.product_id" class="flex flex-col rounded-xl border p-3">
      <div class="mb-3 flex aspect-square items-center justify-center rounded-lg bg-emerald-50 text-5xl text-emerald-700">
        {{ p.name[0] }}
      </div>
      <p class="text-xs text-gray-500">{{ p.category_name }}</p>
      <h2 class="font-semibold">{{ p.name }}</h2>
      <p class="mt-auto pt-2 text-lg font-bold text-emerald-800">฿{{ baht(p.price) }}</p>
      <p v-if="p.stock === 0" class="text-sm text-red-600">สินค้าหมด</p>
      <p v-else class="text-sm text-gray-500">คงเหลือ {{ p.stock }}</p>
    </article>
  </div>
</template>