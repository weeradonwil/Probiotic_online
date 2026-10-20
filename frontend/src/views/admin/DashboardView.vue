<script setup>
import { computed, ref, watch } from 'vue'
import Icon from '../../components/Icon.vue'
import { api } from '../../api'
import { money, date } from '../../format'

const summary = ref(null), error = ref(''), loading = ref(true), days = ref(7)
const monthlyReport = ref(null), monthlyError = ref(''), monthlyLoading = ref(true), downloading = ref(false)
const reportPeriod = ref(currentMonthValue())
let requestNumber = 0
let reportRequestNumber = 0

watch(days, load, { immediate: true })
watch(reportPeriod, loadMonthly, { immediate: true })

function currentMonthValue() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

async function load() {
  const current = ++requestNumber
  loading.value = true
  error.value = ''
  try {
    const result = await api('/admin/overview?days=' + days.value)
    if (current === requestNumber) summary.value = result
  } catch (e) {
    if (current === requestNumber) error.value = e.message
  } finally {
    if (current === requestNumber) loading.value = false
  }
}

async function loadMonthly() {
  const current = ++reportRequestNumber
  const match = /^(\d{4})-(\d{2})$/.exec(reportPeriod.value)
  if (!match) {
    monthlyReport.value = null
    monthlyError.value = 'กรุณาเลือกเดือนที่ต้องการดูรายงาน'
    monthlyLoading.value = false
    return
  }

  monthlyLoading.value = true
  monthlyError.value = ''
  monthlyReport.value = null
  try {
    const result = await api(`/admin/monthly-report?year=${match[1]}&month=${Number(match[2])}`)
    if (current === reportRequestNumber) monthlyReport.value = result
  } catch (e) {
    if (current === reportRequestNumber) monthlyError.value = e.message
  } finally {
    if (current === reportRequestNumber) monthlyLoading.value = false
  }
}

const reportMonthLabel = computed(() => {
  const match = /^(\d{4})-(\d{2})$/.exec(reportPeriod.value)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : ''
})

const revenueComparison = computed(() => {
  if (!monthlyReport.value) return { label: '', tone: 'neutral' }
  const current = Number(monthlyReport.value.revenue)
  const previous = Number(monthlyReport.value.previousRevenue)
  if (previous === 0) return { label: current > 0 ? 'เริ่มมียอดขาย' : 'ไม่มีฐานเปรียบเทียบ', tone: current > 0 ? 'positive' : 'neutral' }
  const change = ((current - previous) / previous) * 100
  return { label: `${change > 0 ? '+' : ''}${change.toFixed(1)}% จากเดือนก่อน`, tone: change >= 0 ? 'positive' : 'negative' }
})

const reportStatuses = computed(() => {
  const counts = monthlyReport.value?.ordersByStatus || {}
  return [
    { key: 'Pending', label: 'รอดำเนินการ', count: counts.Pending || 0 },
    { key: 'Paid', label: 'ชำระแล้ว', count: counts.Paid || 0 },
    { key: 'Shipped', label: 'จัดส่งแล้ว', count: counts.Shipped || 0 },
    { key: 'Cancelled', label: 'ยกเลิก', count: counts.Cancelled || 0 },
    ...(counts.Other ? [{ key: 'Other', label: 'สถานะอื่น', count: counts.Other }] : []),
  ]
})

function csvCell(value) {
  let text = String(value ?? '')
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function downloadMonthlyCsv() {
  if (!monthlyReport.value || downloading.value) return
  downloading.value = true
  try {
    const report = monthlyReport.value
    const change = Number(report.previousRevenue) === 0 ? '' : (((Number(report.revenue) - Number(report.previousRevenue)) / Number(report.previousRevenue)) * 100).toFixed(1)
    const rows = [
      ['รายงานสรุปยอดขายรายเดือน', 'Probiotic Shop'],
      ['เดือน', reportMonthLabel.value],
      ['ยอดชำระที่ยืนยันแล้วตามวันที่แจ้งชำระ (บาท)', report.revenue],
      ['ยอดเดือนก่อน (บาท)', report.previousRevenue],
      ['เปลี่ยนแปลงจากเดือนก่อน (%)', change],
      ['จำนวนรายการชำระที่ยืนยันแล้ว', report.paidOrders],
      ['จำนวนชิ้นสินค้าที่ขายได้', report.unitsSold],
      [],
      ['สถานะปัจจุบันของคำสั่งซื้อตามวันที่สร้างในเดือนที่เลือก'],
      ['สถานะ', 'จำนวนคำสั่งซื้อ'],
      ...reportStatuses.value.map(status => [status.label, status.count]),
      ['รวมคำสั่งซื้อ', report.totalOrders],
      [],
      ['สินค้าขายดี (รายการชำระที่ยืนยันแล้ว)'],
      ['อันดับ', 'สินค้า', 'จำนวนชิ้น', 'ยอดขาย (บาท)'],
      ...report.topProducts.map((product, index) => [index + 1, product.name, product.unitsSold, product.sales]),
    ]
    const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `probiotic-shop-report-${report.year}-${String(report.month).padStart(2, '0')}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } finally {
    downloading.value = false
  }
}

const metrics = computed(() => [
  { label: 'ยอดชำระเงินยืนยันแล้ว', value: summary.value ? money(summary.value.sales) : '—', icon: 'cart' },
  { label: 'จำนวนคำสั่งซื้อ', value: summary.value?.orders ?? '—', icon: 'order' },
  { label: 'จำนวนสินค้าภายในร้าน', value: summary.value?.products ?? '—', icon: 'box' },
  { label: 'รายการชำระเงิน', value: summary.value?.payments ?? '—', icon: 'payment' },
])

// คำนวณพิกัดสำหรับแผนภูมิแท่ง (Bar Chart)
const chart = computed(() => {
  const series = summary.value?.series || []
  const map = new Map(series.map(item => [item.day, Number(item.total)]))
  const data = Array.from({ length: days.value }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - days.value + 1 + i)
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    return { 
      day: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), 
      total: map.get(key) || 0 
    }
  })

  const maximum = Math.max(1, ...data.map(item => item.total))
  const chartWidth = 940
  const startX = 30
  const chartBottomY = 210
  const maxBarHeight = 160
  const slotWidth = chartWidth / data.length
  const barWidth = Math.min(Math.max(slotWidth * 0.55, 12), 48)

  const bars = data.map((item, i) => {
    const height = item.total > 0 ? Math.max((item.total * maxBarHeight) / maximum, 6) : 0
    const x = startX + i * slotWidth + (slotWidth - barWidth) / 2
    const y = chartBottomY - height
    const centerX = x + barWidth / 2
    return {
      ...item,
      x,
      y,
      width: barWidth,
      height,
      centerX
    }
  })

  return { bars, maximum, chartBottomY }
})
</script>

<template>
  <p class="admin-lead">ภาพรวมข้อมูลร้านจากฐานข้อมูลปัจจุบัน</p>
  <p v-if="error" class="error-box" role="alert">{{ error }} <button class="text-link" @click="load">ลองอีกครั้ง</button></p>
  
  <div class="metric-grid">
    <article v-for="item in metrics" :key="item.label" class="panel metric">
      <span class="circle-icon"><Icon :name="item.icon" :size="30" /></span>
      <div>
        <h2>{{ item.label }}</h2>
        <strong>{{ loading ? '—' : item.value }}</strong>
      </div>
    </article>
  </div>

  <section class="panel monthly-report-panel" aria-labelledby="monthly-report-title">
    <div class="monthly-report-heading">
      <div>
        <span class="eyebrow">MONTHLY REPORT</span>
        <h2 id="monthly-report-title">สรุปยอดรายเดือน</h2>
        <p>ยอดขายจัดตามวันที่แจ้งชำระและรวมเฉพาะรายการที่ Admin ยืนยันแล้ว ส่วนคำสั่งซื้อนับตามวันที่สร้าง</p>
      </div>
      <div class="monthly-report-controls">
        <label class="month-picker">เดือนที่ต้องการดู
          <input v-model="reportPeriod" type="month" aria-label="เลือกเดือนและปีสำหรับรายงาน" />
        </label>
        <button class="button button-primary" type="button" :disabled="monthlyLoading || downloading || !monthlyReport" @click="downloadMonthlyCsv">
          <Icon name="download" :size="18" />{{ downloading ? 'กำลังเตรียมไฟล์...' : 'ดาวน์โหลด CSV' }}
        </button>
      </div>
    </div>

    <p v-if="monthlyError" class="error-box monthly-report-error" role="alert">
      {{ monthlyError }} <button class="text-link" type="button" @click="loadMonthly">ลองอีกครั้ง</button>
    </p>
    <p v-else-if="monthlyLoading" class="empty-state monthly-report-loading" role="status">กำลังสรุปข้อมูล{{ reportMonthLabel ? `ประจำเดือน${reportMonthLabel}` : '' }}...</p>
    <template v-else-if="monthlyReport">
      <div class="monthly-report-cards">
        <article class="monthly-stat monthly-stat-revenue">
          <span>ยอดชำระที่ยืนยันแล้ว</span>
          <strong>{{ money(monthlyReport.revenue) }}</strong>
          <small>ไม่นับรายการที่ถูกยกเลิก</small>
        </article>
        <article class="monthly-stat">
          <span>เทียบกับเดือนก่อน</span>
          <strong :class="['monthly-comparison', revenueComparison.tone]">{{ revenueComparison.label }}</strong>
          <small>ยอดเดือนก่อน {{ money(monthlyReport.previousRevenue) }}</small>
        </article>
        <article class="monthly-stat">
          <span>คำสั่งซื้อที่ชำระแล้ว</span>
          <strong>{{ Number(monthlyReport.paidOrders).toLocaleString('th-TH') }} รายการ</strong>
          <small>นับตามวันที่แจ้งชำระเงิน</small>
        </article>
        <article class="monthly-stat">
          <span>จำนวนสินค้าที่ขายได้</span>
          <strong>{{ Number(monthlyReport.unitsSold).toLocaleString('th-TH') }} ชิ้น</strong>
          <small>เฉพาะคำสั่งซื้อที่ชำระแล้ว</small>
        </article>
      </div>

      <div class="monthly-report-details">
        <section class="monthly-status-section" aria-labelledby="monthly-status-title">
          <div class="monthly-subheading">
            <h3 id="monthly-status-title">สถานะคำสั่งซื้อ</h3>
            <span>{{ Number(monthlyReport.totalOrders).toLocaleString('th-TH') }} รายการ</span>
          </div>
          <p class="monthly-detail-note">สถานะปัจจุบันของคำสั่งซื้อที่สร้างในเดือน{{ reportMonthLabel }}</p>
          <div class="monthly-status-list">
            <div v-for="status in reportStatuses" :key="status.key" class="monthly-status-item">
              <span :class="['status-dot', `status-${status.key.toLowerCase()}`]"></span>
              <span>{{ status.label }}</span>
              <strong>{{ Number(status.count).toLocaleString('th-TH') }}</strong>
            </div>
          </div>
        </section>

        <section class="monthly-products-section" aria-labelledby="monthly-products-title">
          <div class="monthly-subheading">
            <h3 id="monthly-products-title">สินค้าขายดี</h3>
            <span>สูงสุด 5 อันดับ</span>
          </div>
          <p class="monthly-detail-note">เรียงตามจำนวนชิ้นที่ขายได้ในเดือนนั้น</p>
          <div v-if="monthlyReport.topProducts.length" class="table-scroll">
            <table class="monthly-products-table">
              <thead><tr><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th></tr></thead>
              <tbody>
                <tr v-for="(product, index) in monthlyReport.topProducts" :key="`${product.name}-${index}`">
                  <td><span class="product-rank">{{ index + 1 }}</span>{{ product.name }}</td>
                  <td>{{ Number(product.unitsSold).toLocaleString('th-TH') }} ชิ้น</td>
                  <td>{{ money(product.sales) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="monthly-no-products">เดือนนี้ยังไม่มีสินค้าที่ชำระเงินยืนยันแล้ว</p>
        </section>
      </div>
    </template>
  </section>

  <section class="panel chart-panel">
    <div class="section-heading">
      <div>
        <h2>ภาพรวมยอดขาย</h2>
        <p>ยอดชำระเงินที่ได้รับการยืนยันแล้ว</p>
      </div>
      <select v-model="days" aria-label="ช่วงเวลากราฟ">
        <option :value="7">7 วันที่ผ่านมา</option>
        <option :value="30">30 วันที่ผ่านมา</option>
      </select>
    </div>

    <p v-if="loading" class="empty-state">กำลังโหลดข้อมูล...</p>
    <p v-else-if="!summary?.series.length" class="empty-state">ยังไม่มีข้อมูลการชำระเงินที่ยืนยันในช่วงนี้</p>
    
    <div v-else class="chart-container">
      <svg class="sales-chart" viewBox="0 0 1000 260" role="img" aria-label="แผนภูมิแท่งยอดชำระเงินรายวัน">
        <!-- เส้น Grid พื้นหลัง -->
        <path v-for="y in [50, 100, 150, 210]" :key="y" :d="'M30 ' + y + 'H970'" stroke="#e2ece5" stroke-dasharray="4 4" />

        <!-- กลุ่มแท่งกราฟ -->
        <g v-for="(bar, i) in chart.bars" :key="i" class="bar-group">
          <!-- เส้นฐานเมื่อยอดเป็น 0 -->
          <rect 
            v-if="bar.total === 0" 
            :x="bar.x" 
            :y="chart.chartBottomY - 2" 
            :width="bar.width" 
            height="2" 
            rx="1" 
            fill="#cbd5e1" 
          />

          <!-- แท่งกราฟเมื่อมียอดขาย -->
          <rect
            v-else
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            rx="5"
            class="chart-bar"
          >
            <title>{{ bar.day }}: {{ money(bar.total) }}</title>
          </rect>

          <!-- ตัวเลขยอดเงินเหนือแท่งกราฟ (แสดงเฉพาะช่วง 7 วันเพื่อไม่ให้ตัวหนังสือเบียดกัน) -->
          <text 
            v-if="bar.total > 0 && days === 7" 
            :x="bar.centerX" 
            :y="bar.y - 8" 
            text-anchor="middle" 
            class="bar-value-text"
          >
            ฿{{ Number(bar.total).toLocaleString() }}
          </text>

          <!-- วันที่ใต้แท่งกราฟ -->
          <text 
            v-if="days === 7 || i % 5 === 0 || i === chart.bars.length - 1"
            :x="bar.centerX" 
            :y="chart.chartBottomY + 22" 
            text-anchor="middle" 
            class="bar-date-label"
          >
            {{ bar.day }}
          </text>
        </g>
      </svg>
      <div class="chart-footer-info">
        <small style="color: #64748b;">* ตัวเลขในกราฟคิดจากยอดคำสั่งซื้อที่ได้รับการอนุมัติแล้ว</small>
        <span style="font-size: 0.85rem; color: #166534; font-weight: 600;">ยอดสูงสุดในช่วงนี้: {{ money(chart.maximum) }}</span>
      </div>
    </div>
  </section>

  <section class="panel recent-panel">
    <div class="section-heading">
      <div>
        <h2>คำสั่งซื้อล่าสุด</h2>
        <p>แสดง 5 รายการล่าสุด</p>
      </div>
      <RouterLink to="/admin/orders" class="button button-outline">ดูทั้งหมด <Icon name="arrow" :size="18" /></RouterLink>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in summary?.recent || []" :key="order.order_id">
            <td>#{{ order.order_id }}</td>
            <td>{{ order.username }}</td>
            <td>{{ money(order.total_amount) }}</td>
            <td><span class="badge">{{ order.status }}</span></td>
            <td>{{ date(order.created_at) }}</td>
          </tr>
          <tr v-if="!summary?.recent.length">
            <td colspan="5" class="table-empty">ยังไม่มีคำสั่งซื้อ</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chart-bar {
  fill: #168052;
  transition: fill 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.chart-bar:hover {
  fill: #0d5f3a;
  filter: brightness(1.1);
}

.bar-value-text {
  font-size: 13px;
  font-weight: 700;
  fill: #166534;
}

.bar-date-label {
  font-size: 12px;
  fill: #64748b;
  font-weight: 500;
}

.chart-footer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.5rem;
  margin-top: 0.5rem;
}
</style>
