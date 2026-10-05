<script setup>
import { ref, watch, computed } from 'vue'
import { api } from '../../api'
import { money, date } from '../../format'
const props = defineProps({ kind: String })
const data = ref([]), total = ref(0), page = ref(1), loading = ref(true), error = ref('')
const pages = computed(() => Math.max(1, Math.ceil(total.value / 20)))
// ป้องกันผลจากหน้า orders ที่ยังค้างอยู่เขียนทับหน้า payments เมื่อผู้ใช้สลับเมนู
let requestNumber = 0
async function load() {
  const current = ++requestNumber
  loading.value = true; error.value = ''
  try { const result = await api('/admin/' + props.kind + '?page=' + page.value); if (current === requestNumber) { data.value = result.data; total.value = result.total } }
  catch (e) { if (current === requestNumber) error.value = e.message }
  finally { if (current === requestNumber) loading.value = false }
}
// ตารางนี้เป็นการอ่านข้อมูลเท่านั้น การเปลี่ยนสถานะต้องมี workflow ตรวจสอบเพิ่มเติม
watch(() => props.kind, () => { page.value = 1; data.value = []; load() }, { immediate: true })
</script>
<template><p class="admin-lead">รายการ{{ kind === 'orders' ? 'คำสั่งซื้อ' : 'ชำระเงิน' }}จากฐานข้อมูล</p><p v-if="error" class="error-box" role="alert">{{ error }}</p><section class="panel"><p v-if="loading" class="empty-state">กำลังโหลด...</p><div v-else class="table-scroll"><table><thead><tr><th>ID</th><th>{{ kind === 'orders' ? 'ลูกค้า' : 'Order ID' }}</th><th>{{ kind === 'orders' ? 'ยอดรวม' : 'ยอดชำระ' }}</th><th>สถานะ</th><th>วันที่</th></tr></thead><tbody><tr v-for="item in data" :key="item.order_id + '-' + item.payment_id"><td>#{{ kind === 'orders' ? item.order_id : item.payment_id }}</td><td>{{ kind === 'orders' ? item.username : '#' + item.order_id }}</td><td>{{ money(kind === 'orders' ? item.total_amount : item.amount) }}</td><td><span :class="['badge', { rejected: ['Rejected', 'Cancelled'].includes(item.payment_status || item.status) }]">{{ item.status || item.payment_status }}</span></td><td>{{ date(item.created_at || item.payment_date) }}</td></tr><tr v-if="!data.length"><td colspan="5" class="table-empty">ยังไม่มีรายการ</td></tr></tbody></table></div><div class="table-footer"><span>{{ total }} รายการ</span><div class="pagination"><button :disabled="page === 1" @click="page--; load()" aria-label="หน้าก่อนหน้า">‹</button><span>{{ page }} / {{ pages }}</span><button :disabled="page === pages" @click="page++; load()" aria-label="หน้าถัดไป">›</button></div></div></section></template>
