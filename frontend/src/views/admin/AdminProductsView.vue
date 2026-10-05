<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import ProductImage from '../../components/ProductImage.vue'
import { api } from '../../api'
import { money, date } from '../../format'
const products = ref([]), categories = ref([]), query = ref(''), category = ref(''), page = ref(1), total = ref(0)
const error = ref(''), loading = ref(false), saving = ref(false), notice = ref(''), formOpen = ref(false), editId = ref(null), form = ref({})
const productForm = ref(null)
const pages = computed(() => Math.max(1, Math.ceil(total.value / 8)))
async function load() {
  loading.value = true; error.value = ''
  try { const params = new URLSearchParams({ q: query.value, page: page.value, limit: 8 }); if (category.value) params.set('category_id', category.value); const result = await api('/products?' + params); products.value = result.data; total.value = result.total }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
}
function filter() { page.value = 1; load() }
function open(product) {
  editId.value = product?.product_id || null
  form.value = { name: product?.name || '', category_id: product?.category_id || '', description: product?.description || '', price: product?.price ?? '', stock: product?.stock ?? 0, image: product?.image || '' }
  formOpen.value = true; notice.value = ''; error.value = ''
  // มือถือแสดงฟอร์มใต้ตาราง จึงเลื่อนไปฟอร์มและย้าย focus เพื่อไม่ให้ผู้ใช้หาแผงแก้ไขไม่เจอ
  nextTick(() => {
    if (window.matchMedia('(max-width: 1250px)').matches) productForm.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    productForm.value?.querySelector('input')?.focus({ preventScroll: true })
  })
}
async function save() {
  saving.value = true; error.value = ''
  try {
    // ส่งข้อมูลครบทั้งรายการตามสัญญา PUT ของ API และให้ backend ตรวจ JWT/role ซ้ำ
    await api('/products' + (editId.value ? '/' + editId.value : ''), { method: editId.value ? 'PUT' : 'POST', body: form.value })
    notice.value = editId.value ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ'
    formOpen.value = false; await load()
  } catch (e) { error.value = e.errors?.join(' · ') || e.message }
  finally { saving.value = false }
}
async function remove(product) {
  if (!window.confirm('ยืนยันลบสินค้า “' + product.name + '” ?')) return
  try { await api('/products/' + product.product_id, { method: 'DELETE' }); notice.value = 'ลบสินค้าสำเร็จ'; if (products.value.length === 1 && page.value > 1) page.value--; await load() }
  catch (e) { error.value = e.message }
}
onMounted(async () => { try { categories.value = (await api('/categories')).data } catch (e) { error.value = e.message }; await load() })
</script>
<template><p class="admin-lead">จัดการข้อมูลสินค้า เพิ่ม แก้ไข หรือลบสินค้าใน Probiotic Shop</p><p v-if="error" class="error-box" role="alert">{{ error }}</p><p v-if="notice" class="success-box" role="status">{{ notice }}</p><div :class="['admin-product-grid', { editing: formOpen }]"><section class="panel">
  <form class="admin-toolbar" @submit.prevent="filter"><div class="input-icon"><Icon name="search" /><input v-model="query" placeholder="ค้นหาสินค้า..." aria-label="ค้นหาสินค้า" /></div><select v-model="category" aria-label="กรองหมวดหมู่" @change="filter"><option value="">ทุกหมวดหมู่</option><option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.name }}</option></select><button class="button button-outline">ค้นหา</button><button type="button" class="button button-primary" @click="open()"><Icon name="plus" />เพิ่มสินค้า</button></form>
  <p v-if="loading" class="empty-state">กำลังโหลดสินค้า...</p><div v-else class="table-scroll"><table><thead><tr><th>ID</th><th>สินค้า</th><th>หมวดหมู่</th><th>ราคา</th><th>Stock</th><th>วันที่เพิ่ม</th><th>จัดการ</th></tr></thead><tbody><tr v-for="p in products" :key="p.product_id"><td>#{{ p.product_id }}</td><td><div class="table-product"><ProductImage :product="p" /><div><strong>{{ p.name }}</strong><small>{{ p.description }}</small></div></div></td><td><span class="badge">{{ p.category_name }}</span></td><td>{{ money(p.price) }}</td><td><span :class="['badge', { rejected: !p.stock }]">{{ p.stock ?? 0 }}</span></td><td class="nowrap">{{ date(p.created_at) }}</td><td><div class="row-actions"><button class="icon-button" :aria-label="'แก้ไข ' + p.name" @click="open(p)"><Icon name="edit" :size="18" /></button><button class="icon-button danger" :aria-label="'ลบ ' + p.name" @click="remove(p)"><Icon name="trash" :size="18" /></button></div></td></tr><tr v-if="!products.length"><td colspan="7" class="table-empty">ไม่พบสินค้า</td></tr></tbody></table></div>
  <div class="table-footer"><span>{{ total }} รายการ</span><div class="pagination"><button :disabled="page === 1" aria-label="หน้าก่อนหน้า" @click="page--; load()">‹</button><span>{{ page }} / {{ pages }}</span><button :disabled="page === pages" aria-label="หน้าถัดไป" @click="page++; load()">›</button></div></div>
</section><form v-if="formOpen" ref="productForm" class="panel form-stack admin-product-form" @submit.prevent="save"><div class="section-heading"><h2>{{ editId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า' }}</h2><button type="button" class="icon-button" aria-label="ปิดฟอร์มสินค้า" @click="formOpen = false"><Icon name="close" /></button></div><label>ชื่อสินค้า *<input v-model="form.name" required maxlength="150" placeholder="ชื่อสินค้า" /></label><label>หมวดหมู่ *<select v-model="form.category_id" required><option disabled value="">เลือกหมวดหมู่สินค้า</option><option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.name }}</option></select></label><label>รายละเอียด<textarea v-model="form.description" rows="4" maxlength="5000" placeholder="รายละเอียดสินค้า"></textarea></label><div class="two-fields"><label>ราคา (บาท) *<input v-model="form.price" required type="number" min="0" max="99999999.99" step=".01" /></label><label>Stock *<input v-model="form.stock" required type="number" min="0" max="2147483647" step="1" /></label></div><label>ชื่อไฟล์รูปสินค้า<input v-model="form.image" placeholder="example.jpg" /></label><p class="field-help">วางไฟล์รูปใน frontend/public/images/products แล้วระบุชื่อไฟล์ ระบบอัปโหลดยังไม่เปิดใช้งาน</p><ProductImage :product="form" /><div class="two-fields"><button type="button" class="button button-outline" @click="formOpen = false">ยกเลิก</button><button class="button button-primary" :disabled="saving">{{ saving ? 'กำลังบันทึก...' : 'บันทึกสินค้า' }}</button></div></form></div></template>
