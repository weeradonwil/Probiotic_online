<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageBanner from '../components/PageBanner.vue'
import Icon from '../components/Icon.vue'
import { auth } from '../auth'
import { cart } from '../cart'
import { money } from '../format'

const router = useRouter()
const orders = ref([])
const loading = ref(true)
const payOrderId = ref(null)
const slipFile = ref(null)
const phoneNumber = ref('')
const isUploading = ref(false)

// State สำหรับ Modal ยืนยันยกเลิกคำสั่งซื้อแบบสวยงาม
const cancelModalOpen = ref(false)
const orderToCancel = ref(null)
const isCancelling = ref(false)

// State สำหรับพิมพ์และโหลด PDF ใบเสร็จ
const receiptModalOpen = ref(false)
const currentReceiptOrder = ref(null)
const isDownloadingPdf = ref(false)

const fetchMyOrders = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:3000/api/orders/my-orders', {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    orders.value = data
  } catch (err) {
    alert(err.message || 'ดึงข้อมูลไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

const handleFileChange = (e) => {
  slipFile.value = e.target.files[0]
}

// 1. ฟังก์ชันเปิด Modal สวยๆ เวลากดปุ่มยกเลิกคำสั่งซื้อ
const promptCancelOrder = (order) => {
  orderToCancel.value = order
  cancelModalOpen.value = true
}

// 2. ฟังก์ชันยิง API ขอยกเลิกคำสั่งซื้อจริงเมื่อกดยืนยันใน Modal
const confirmCancelOrder = async () => {
  if (!orderToCancel.value) return

  isCancelling.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/orders/${orderToCancel.value.order_id}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    cancelModalOpen.value = false
    orderToCancel.value = null
    await fetchMyOrders()
  } catch (err) {
    alert(err.message || 'ไม่สามารถยกเลิกคำสั่งซื้อได้')
  } finally {
    isCancelling.value = false
  }
}

const submitPayment = async () => {
  if (!slipFile.value) {
    alert('กรุณาเลือกไฟล์สลิป')
    return
  }

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('slip', slipFile.value)
    if (phoneNumber.value) formData.append('phone', phoneNumber.value)
    formData.append('payment_method', 'Bank Transfer')

    const res = await fetch(`http://localhost:3000/api/orders/${payOrderId.value}/pay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.token}`
      },
      body: formData
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    alert('แจ้งชำระเงินเรียบร้อยแล้ว')
    payOrderId.value = null
    slipFile.value = null
    await fetchMyOrders()
  } catch (err) {
    alert(err.message || 'อัปโหลดสลิปไม่สำเร็จ')
  } finally {
    isUploading.value = false
  }
}

const reorderItems = (order) => {
  if (!order.items || order.items.length === 0) return
  
  order.items.forEach(item => {
    cart.add({
      product_id: item.product_id,
      name: item.product_name,
      price: item.price || (item.subtotal / item.quantity),
      image: item.product_image
    }, item.quantity)
  })

  router.push('/cart')
}

const openReceiptModal = (order) => {
  currentReceiptOrder.value = order
  receiptModalOpen.value = true
}

const isPaymentVerified = (order) => order?.payment_status === 'Verified'

const paymentStatusLabel = (order) => {
  if (isPaymentVerified(order)) return 'ชำระเงินยืนยันแล้ว'
  if (order?.slip_image) return 'แนบสลิปแล้ว (รอตรวจสอบ)'
  return 'ยังไม่ชำระเงิน/ยังไม่แนบสลิป'
}

const orderStatusLabel = (order) => {
  if (order?.status === 'Paid' && !isPaymentVerified(order)) return 'รอตรวจสอบการชำระเงิน'
  if (order?.status === 'cancelled' || order?.status === 'Cancelled') return 'ยกเลิกแล้ว'
  return order?.status || 'ไม่ทราบสถานะ'
}

const printReceipt = () => {
  window.print()
}

const downloadPDF = async () => {
  const element = document.getElementById('printable-invoice')
  if (!element) return

  isDownloadingPdf.value = true
  try {
    if (!window.html2pdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    const opt = {
      margin:       0,
      filename:     `${isPaymentVerified(currentReceiptOrder.value) ? 'receipt' : 'order-summary'}-${currentReceiptOrder.value?.order_id || 'order'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', '.document-header', '.customer-details', '.document-total'] }
    }

    await window.html2pdf().set(opt).from(element).save()
  } catch (err) {
    console.error(err)
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF สามารถเลือก "Save as PDF" ในหน้าต่างสั่งพิมพ์แทนได้ครับ')
    window.print()
  } finally {
    isDownloadingPdf.value = false
  }
}

// ฟังก์ชันหาตำแหน่งรูปภาพสินค้าให้ถูกต้องตามโครงสร้างโฟลเดอร์
const getProductImage = (item) => {
  const img = item.product_image || item.image || ''
  
  if (img) {
    if (img.startsWith('http://') || img.startsWith('https://')) return img
    if (img.startsWith('/')) return img
    return `/images/products/${img}`
  }

  return `/images/products/${item.product_id}.jpg`
}

onMounted(() => {
  fetchMyOrders()
})
</script>

<template>
  <div class="print-hide">
    <PageBanner title="ประวัติการสั่งซื้อ" subtitle="ติดตามสถานะคำสั่งซื้อและรายการสินค้าของคุณ" />
  </div>

  <section class="page-shell section print-hide">
    <div v-if="loading" class="panel empty-state">กำลังโหลดข้อมูลคำสั่งซื้อ...</div>

    <div v-else-if="!orders.length" class="panel empty-state">
      <Icon name="cart" :size="48" />
      <h2>คุณยังไม่มีประวัติการสั่งซื้อ</h2>
      <RouterLink to="/products" class="button button-primary">เลือกชมสินค้า</RouterLink>
    </div>

    <div v-else style="display: flex; flex-direction: column; gap: 1.5rem;">
      <article v-for="order in orders" :key="order.order_id" class="panel">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div>
            <h3 style="margin: 0;">คำสั่งซื้อ #{{ order.order_id }}</h3>
            <small style="color: #6b7280;">สั่งซื้อเมื่อ: {{ new Date(order.created_at).toLocaleString('th-TH') }}</small>
          </div>
          <div>
            <span 
              style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600;"
              :style="{
                background: order.status === 'Paid' && isPaymentVerified(order) ? '#dcfce7' : order.status === 'Shipped' ? '#dbeafe' : ['cancelled', 'Cancelled'].includes(order.status) ? '#fee2e2' : '#fef9c3',
                color: order.status === 'Paid' && isPaymentVerified(order) ? '#166534' : order.status === 'Shipped' ? '#1e40af' : ['cancelled', 'Cancelled'].includes(order.status) ? '#dc2626' : '#854d0e'
              }"
            >
              สถานะ: {{ orderStatusLabel(order) }}
            </span>
          </div>
        </div>

        <!-- รายการสินค้า -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="margin: 0 0 0.75rem 0; color: #374151; font-size: 0.95rem;">รายการสินค้า</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div 
              v-for="item in order.items" 
              :key="item.order_item_id" 
              style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem; background: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6;"
            >
              <div style="display: flex; align-items: center; gap: 0.85rem;">
                <img 
                  :src="getProductImage(item)" 
                  :alt="item.product_name"
                  style="width: 54px; height: 54px; object-fit: contain; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; flex-shrink: 0; padding: 2px;"
                  @error="$event.target.src = '/images/' + (item.product_image || item.product_id + '.jpg')"
                />
                <div>
                  <strong style="color: #1f2937; font-size: 0.95rem; display: block;">{{ item.product_name }}</strong>
                  <span style="color: #6b7280; font-size: 0.85rem;">จำนวน: x{{ item.quantity }}</span>
                </div>
              </div>
              <strong style="color: #111827; font-size: 0.95rem; white-space: nowrap;">{{ money(item.subtotal) }}</strong>
            </div>
          </div>
        </div>

        <!-- รายละเอียดและปุ่มการทำงานด้านล่าง -->
        <div style="border-top: 1px dashed #e5e7eb; padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <p style="margin: 0; font-size: 0.875rem; color: #4b5563;">ที่อยู่จัดส่ง: {{ order.shipping_address }}</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem;">
              การชำระเงิน: 
              <strong :style="{ color: isPaymentVerified(order) ? '#059669' : order.slip_image ? '#b45309' : '#dc2626' }">
                {{ paymentStatusLabel(order) }}
              </strong>
            </p>
          </div>

          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
            <div style="font-size: 1.125rem; font-weight: bold;">
              ยอดรวม: {{ money(order.total_amount) }}
            </div>
            
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <!-- ปุ่มพิมพ์ใบเสร็จ -->
              <button 
                type="button"
                style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 0.85rem; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;"
                @click="openReceiptModal(order)"
              >
                {{ isPaymentVerified(order) ? '🖨️ พิมพ์ใบเสร็จ' : '🖨️ พิมพ์สรุปคำสั่งซื้อ' }}
              </button>

              <!-- ปุ่มยกเลิกคำสั่งซื้อ (เปลี่ยนมาเปิด Modal สวยๆ) -->
              <button 
                v-if="order.status.toLowerCase() === 'pending'"
                type="button"
                style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 0.85rem; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; transition: all 0.2s;"
                @click="promptCancelOrder(order)"
              >
                ยกเลิกคำสั่งซื้อ
              </button>

              <!-- ปุ่มแนบสลิปโอนเงิน -->
              <button 
                v-if="order.status.toLowerCase() === 'pending' && !order.slip_image" 
                class="button button-primary" 
                style="font-size: 0.85rem; padding: 0.4rem 0.8rem;"
                @click="payOrderId = order.order_id"
              >
                แนบสลิปโอนเงิน
              </button>

              <!-- ปุ่มซื้ออีกครั้ง -->
              <button 
                type="button"
                class="button button-primary"
                style="font-size: 0.85rem; padding: 0.4rem 0.85rem; display: flex; align-items: center; gap: 0.35rem; background: #168052;"
                @click="reorderItems(order)"
              >
                🔄 ซื้ออีกครั้ง
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>

  <!-- Modal ยืนยันยกเลิกคำสั่งซื้อแบบสวยงาม (Modern Confirmation Modal) -->
  <div 
    v-if="cancelModalOpen" 
    class="custom-modal-backdrop"
    @click.self="cancelModalOpen = false"
  >
    <div class="custom-modal-card">
      <div class="cancel-icon-circle">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      
      <h3 style="margin: 0.25rem 0 0.5rem 0; font-size: 1.25rem; color: #111827; font-weight: 700;">
        ยืนยันการยกเลิกคำสั่งซื้อ?
      </h3>
      
      <p style="margin: 0; color: #6b7280; font-size: 0.925rem; line-height: 1.5;">
        คุณต้องการยกเลิกคำสั่งซื้อ <strong style="color: #1f2937;">#{{ orderToCancel?.order_id }}</strong> ใช่หรือไม่?<br />
        <span style="color: #dc2626; font-size: 0.85rem;">* สต็อกสินค้าจะถูกคืนกลับเข้าระบบทันที</span>
      </p>

      <div class="custom-modal-actions">
        <button 
          type="button" 
          class="btn-modal-cancel" 
          :disabled="isCancelling"
          @click="cancelModalOpen = false"
        >
          กลับไป
        </button>
        <button 
          type="button" 
          class="btn-modal-confirm-delete" 
          :disabled="isCancelling"
          @click="confirmCancelOrder"
        >
          {{ isCancelling ? 'กำลังยกเลิก...' : 'ใช่, ยกเลิกออเดอร์นี้' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modal พิมพ์ใบเสร็จคำสั่งซื้อ (Receipt / Invoice) คงไว้ตามเดิมทุกประการ -->
  <div 
    v-if="receiptModalOpen" 
    class="receipt-modal-backdrop"
    @click.self="receiptModalOpen = false"
  >
    <div class="receipt-card">
      <div class="receipt-actions print-hide">
        <button 
          type="button" 
          class="button" 
          style="background: #0284c7; color: white; border: none; font-size: 0.875rem; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.35rem;"
          :disabled="isDownloadingPdf"
          @click="downloadPDF"
        >
          {{ isDownloadingPdf ? '⏳ กำลังสร้าง PDF...' : '📥 ดาวน์โหลด PDF' }}
        </button>

        <button type="button" class="button button-primary" @click="printReceipt">
          🖨️ สั่งพิมพ์เอกสาร
        </button>
        <button type="button" class="button button-outline" @click="receiptModalOpen = false">
          ปิด
        </button>
      </div>

      <!-- เนื้อหาใบเสร็จรับเงิน -->
      <div class="receipt-body" id="printable-invoice">
        <header class="document-header">
          <div class="document-brand">
            <h2>Probiotic <span>Shop</span></h2>
            <p>Good Bacteria · Better Life</p>
          </div>
          <div class="document-type">
            <span class="document-status" :class="{ 'is-paid': isPaymentVerified(currentReceiptOrder) }">
              {{ isPaymentVerified(currentReceiptOrder) ? 'ชำระเงินแล้ว' : 'รอตรวจสอบ / ยังไม่ชำระ' }}
            </span>
            <h1>{{ isPaymentVerified(currentReceiptOrder) ? 'ใบเสร็จรับเงิน' : 'สรุปคำสั่งซื้อ' }}</h1>
            <p v-if="!isPaymentVerified(currentReceiptOrder)" class="document-notice">เอกสารนี้ยังไม่ใช่ใบเสร็จรับเงิน</p>
          </div>
        </header>

        <div class="document-meta">
          <div><span>เลขที่คำสั่งซื้อ</span><strong>#{{ currentReceiptOrder?.order_id }}</strong></div>
          <div><span>วันที่สั่งซื้อ</span><strong>{{ new Date(currentReceiptOrder?.created_at).toLocaleString('th-TH') }}</strong></div>
          <div><span>สถานะคำสั่งซื้อ</span><strong>{{ orderStatusLabel(currentReceiptOrder) }}</strong></div>
        </div>

        <section class="customer-details">
          <div>
            <h3>ข้อมูลลูกค้า</h3>
            <p><span>ชื่อ</span><strong>{{ auth.user?.full_name || auth.user?.username }}</strong></p>
            <p><span>ที่อยู่จัดส่ง</span><strong>{{ currentReceiptOrder?.shipping_address }}</strong></p>
          </div>
          <div>
            <h3>ข้อมูลการชำระเงิน</h3>
            <p><span>สถานะ</span><strong>{{ paymentStatusLabel(currentReceiptOrder) }}</strong></p>
            <p><span>ช่องทาง</span><strong>{{ currentReceiptOrder?.payment_method || 'โอนผ่านธนาคาร' }}</strong></p>
          </div>
        </section>

        <table class="receipt-table">
          <thead>
            <tr>
              <th class="item-name">รายการสินค้า</th>
              <th class="item-quantity">จำนวน</th>
              <th class="item-price">ราคาต่อชิ้น</th>
              <th class="item-subtotal">รวม</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in currentReceiptOrder?.items" :key="item.order_item_id">
              <td class="item-name">{{ item.product_name }}</td>
              <td class="item-quantity">{{ item.quantity }}</td>
              <td class="item-price">{{ money(item.price || (item.subtotal / item.quantity)) }}</td>
              <td class="item-subtotal">{{ money(item.subtotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="document-total">
          <span>ยอดรวมสุทธิ</span>
          <strong>{{ money(currentReceiptOrder?.total_amount) }}</strong>
        </div>

        <footer class="document-footer">
          <p>ขอบคุณที่ไว้วางใจเลือกใช้บริการ Probiotic Shop</p>
          <span>เอกสารจัดทำโดยระบบ Probiotic Shop</span>
        </footer>
      </div>
    </div>
  </div>

  <!-- Modal แนบสลิป -->
  <div 
    v-if="payOrderId" 
    class="print-hide"
    style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem;"
    @click.self="payOrderId = null"
  >
    <div style="background: white; padding: 1.5rem; border-radius: 8px; max-width: 450px; width: 100%;">
      <h3 style="margin-top: 0;">แนบสลิปสำหรับคำสั่งซื้อ #{{ payOrderId }}</h3>
      <form @submit.prevent="submitPayment" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">เบอร์โทรศัพท์ติดต่อ</label>
          <input v-model="phoneNumber" type="tel" placeholder="08X-XXX-XXXX" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;" />
        </div>
        <div>
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">รูปสลิปหลักฐานการโอน *</label>
          <input type="file" accept="image/*" required @change="handleFileChange" />
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button type="button" class="button button-outline" @click="payOrderId = null">ยกเลิก</button>
          <button type="submit" class="button button-primary" :disabled="isUploading">
            {{ isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการแนบสลิป' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* สไตล์กล่องยืนยันการยกเลิกคำสั่งซื้อ (Modern Confirmation Modal) */
.custom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 80;
  padding: 1.25rem;
  animation: fadeIn 0.2s ease-out;
}

.custom-modal-card {
  background: white;
  border-radius: 16px;
  max-width: 420px;
  width: 100%;
  padding: 1.75rem 1.5rem;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.cancel-icon-circle {
  width: 56px;
  height: 56px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem auto;
}

.custom-modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-modal-cancel {
  flex: 1;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-modal-cancel:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-modal-confirm-delete {
  flex: 1.2;
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.25);
  transition: all 0.15s;
}

.btn-modal-confirm-delete:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-modal-confirm-delete:disabled,
.btn-modal-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Modal ใบเสร็จ */
.receipt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.68);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 70;
  padding: 24px;
  overflow: auto;
}

.receipt-card {
  background: #fff;
  border-radius: 14px;
  max-width: 980px;
  width: 100%;
  box-shadow: 0 24px 70px rgba(2, 20, 14, 0.28);
  overflow: hidden;
}

.receipt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #f8fbf9;
  border-bottom: 1px solid #e2e8f0;
}

.receipt-body {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 210mm;
  min-height: 296mm;
  margin: 0 auto;
  padding: 18mm;
  background: #fff;
  color: #24352d;
  font-family: inherit;
  font-size: 11pt;
  line-height: 1.55;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid #087044;
}

.document-brand h2 {
  margin: 0;
  color: #064e35;
  font-size: 24pt;
  font-weight: 750;
  letter-spacing: -0.7px;
  line-height: 1.15;
}

.document-brand h2 span { color: #168052; font-weight: 450; }
.document-brand p { margin: 6px 0 0; color: #64756c; font-size: 9pt; letter-spacing: 0.3px; }
.document-type { text-align: right; }
.document-type h1 { margin: 12px 0 0; color: #123d2c; font-size: 21pt; line-height: 1.2; }
.document-status { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #fff3cd; color: #855b00; font-size: 9pt; font-weight: 700; }
.document-status.is-paid { background: #dcfce7; color: #166534; }
.document-notice { margin: 4px 0 0; color: #9a6700; font-size: 8.5pt; }

.document-meta {
  display: grid;
  grid-template-columns: 0.8fr 1.5fr 1fr;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid #e4ebe6;
}
.document-meta div, .customer-details p { display: flex; flex-direction: column; gap: 3px; margin: 0; }
.document-meta span, .customer-details p span { color: #718078; font-size: 8.5pt; }
.document-meta strong, .customer-details p strong { color: #25382f; font-size: 10pt; font-weight: 600; overflow-wrap: anywhere; }

.customer-details {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 20px;
  margin: 22px 0 26px;
}
.customer-details > div { padding: 16px 18px; border: 1px solid #e2ebe5; border-radius: 8px; background: #fbfdfb; }
.customer-details h3 { margin: 0 0 12px; color: #07583a; font-size: 10pt; }
.customer-details p + p { margin-top: 10px; }

.receipt-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0;
  font-size: 10pt;
}

.receipt-table th {
  padding: 11px 12px;
  background: #eff6f1;
  color: #174c35;
  font-weight: 600;
  border-top: 1px solid #dce8df;
  border-bottom: 1px solid #cbdccf;
  text-align: right;
}

.receipt-table td {
  padding: 13px 12px;
  border-bottom: 1px solid #e8eee9;
  color: #384a40;
  vertical-align: top;
  overflow-wrap: anywhere;
}
.receipt-table .item-name { width: 52%; text-align: left; }
.receipt-table .item-quantity { width: 12%; text-align: center; }
.receipt-table .item-price { width: 18%; text-align: right; white-space: nowrap; }
.receipt-table .item-subtotal { width: 18%; text-align: right; white-space: nowrap; font-weight: 650; }
.receipt-table tr { break-inside: avoid; page-break-inside: avoid; }
.receipt-table thead { display: table-header-group; }

.document-total { display: flex; justify-content: flex-end; align-items: baseline; gap: 30px; margin-top: 22px; padding: 16px 18px; border-radius: 8px; background: #f1f8f3; }
.document-total span { color: #53675b; font-size: 11pt; font-weight: 600; }
.document-total strong { color: #07583a; font-size: 19pt; font-weight: 750; white-space: nowrap; }
.document-footer { margin-top: auto; padding-top: 34px; text-align: center; color: #607268; }
.document-footer p { margin: 0 0 4px; color: #17623f; font-size: 10pt; font-weight: 600; }
.document-footer span { font-size: 8pt; }

@media print {
  @page { size: A4 portrait; margin: 0; }
  :global(body) { margin: 0 !important; background: #fff !important; }
  :global(body *) {
    visibility: hidden !important;
  }
  .receipt-modal-backdrop, .receipt-card {
    visibility: visible !important;
    position: static !important;
    background: none !important;
    padding: 0 !important;
    border: 0 !important;
  }
  #printable-invoice, #printable-invoice * {
    visibility: visible !important;
  }
  #printable-invoice {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 210mm !important;
    min-height: 296mm !important;
    margin: 0 !important;
    padding: 18mm !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  .print-hide {
    display: none !important;
  }
}
</style>
