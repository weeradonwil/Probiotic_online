<script setup>
import { computed, ref, watch } from 'vue'
import Icon from '../../components/Icon.vue'
import { api } from '../../api'
import { money, date } from '../../format'
const summary = ref(null), error = ref(''), loading = ref(true), days = ref(7)
// สลับช่วงเวลาเร็ว ๆ ต้องให้เฉพาะ request ล่าสุดอัปเดตการ์ดและกราฟ
let requestNumber = 0
watch(days, load, { immediate: true })
async function load() {
  const current = ++requestNumber
  loading.value = true; error.value = ''
  try { const result = await api('/admin/overview?days=' + days.value); if (current === requestNumber) summary.value = result }
  catch (e) { if (current === requestNumber) error.value = e.message }
  finally { if (current === requestNumber) loading.value = false }
}
const metrics = computed(() => [
  { label: 'ยอดชำระเงินยืนยันแล้ว', value: summary.value ? money(summary.value.sales) : '—', icon: 'cart' },
  { label: 'จำนวนคำสั่งซื้อ', value: summary.value?.orders ?? '—', icon: 'order' },
  { label: 'จำนวนสินค้า', value: summary.value?.products ?? '—', icon: 'box' },
  { label: 'รายการชำระเงิน', value: summary.value?.payments ?? '—', icon: 'payment' },
])
// กราฟใช้ยอดเงินจริงจาก payments ที่ Verified และเติมวันที่ไม่มีรายการด้วยศูนย์
const chart = computed(() => {
  const series = summary.value?.series || []
  const map = new Map(series.map(item => [item.day, Number(item.total)]))
  const data = Array.from({ length: days.value }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - days.value + 1 + i)
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    return { day: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), total: map.get(key) || 0 }
  })
  const maximum = Math.max(1, ...data.map(item => item.total))
  const points = data.map((item, i) => (30 + i * 940 / (data.length - 1)) + ',' + (220 - item.total * 180 / maximum))
  return { points: points.join(' '), area: '30,220 ' + points.join(' ') + ' 970,220', data, maximum }
})
</script>
<template><p class="admin-lead">ภาพรวมข้อมูลร้านจากฐานข้อมูลปัจจุบัน</p><p v-if="error" class="error-box" role="alert">{{ error }} <button class="text-link" @click="load">ลองอีกครั้ง</button></p><div class="metric-grid"><article v-for="item in metrics" :key="item.label" class="panel metric"><span class="circle-icon"><Icon :name="item.icon" :size="30" /></span><div><h2>{{ item.label }}</h2><strong>{{ loading ? '—' : item.value }}</strong></div></article></div>
  <section class="panel chart-panel"><div class="section-heading"><div><h2>ภาพรวมยอดขาย</h2><p>ยอดชำระเงินที่ได้รับการยืนยันแล้ว</p></div><select v-model="days" aria-label="ช่วงเวลากราฟ"><option :value="7">7 วันที่ผ่านมา</option><option :value="30">30 วันที่ผ่านมา</option></select></div><p v-if="loading" class="empty-state">กำลังโหลดข้อมูล...</p><p v-else-if="!summary?.series.length" class="empty-state">ยังไม่มีข้อมูลการชำระเงินที่ยืนยันในช่วงนี้</p><template v-else><svg class="sales-chart" viewBox="0 0 1000 250" role="img" aria-label="กราฟยอดชำระเงินรายวัน"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a9862" stop-opacity=".3" /><stop offset="100%" stop-color="#2a9862" stop-opacity=".03" /></linearGradient></defs><path v-for="y in [40,100,160,220]" :key="y" :d="'M30 ' + y + 'H970'" stroke="#dceae1" stroke-dasharray="4 4" /><polygon :points="chart.area" fill="url(#chart-fill)" /><polyline :points="chart.points" fill="none" stroke="#168052" stroke-width="3" /></svg><div class="chart-labels"><span>{{ chart.data[0].day }}</span><span>สูงสุด {{ money(chart.maximum) }}</span><span>{{ chart.data[chart.data.length - 1].day }}</span></div></template></section>
  <section class="panel recent-panel"><div class="section-heading"><div><h2>คำสั่งซื้อล่าสุด</h2><p>แสดง 5 รายการล่าสุด</p></div><RouterLink to="/admin/orders" class="button button-outline">ดูทั้งหมด <Icon name="arrow" :size="18" /></RouterLink></div><div class="table-scroll"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody><tr v-for="order in summary?.recent || []" :key="order.order_id"><td>#{{ order.order_id }}</td><td>{{ order.username }}</td><td>{{ money(order.total_amount) }}</td><td><span class="badge">{{ order.status }}</span></td><td>{{ date(order.created_at) }}</td></tr><tr v-if="!summary?.recent.length"><td colspan="5" class="table-empty">ยังไม่มีคำสั่งซื้อ</td></tr></tbody></table></div></section>
</template>
