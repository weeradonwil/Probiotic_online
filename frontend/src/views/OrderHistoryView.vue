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

const cancelOrder = async (orderId) => {
  if (!confirm(`คุณต้องการยกเลิกคำสั่งซื้อ #${orderId} ใช่หรือไม่? สต็อกสินค้าจะถูกคืนกลับเข้าระบบทันที`)) {
    return
  }

  try {
    const res = await fetch(`http://localhost:3000/api/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    alert(data.message)
    await fetchMyOrders()
  } catch (err) {
    alert(err.message || 'ไม่สามารถยกเลิกคำสั่งซื้อได้')
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
      margin:       10,
      filename:     `receipt-order-${currentReceiptOrder.value?.order_id || 'invoice'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a5', orientation: 'portrait' }
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

const getProductImage = (item) => {
  if (item.product_image) {
    if (item.product_image.startsWith('http')) return item.product_image
    return item.product_image.startsWith('/') ? item.product_image : '/' + item.product_image
  }
  return `/images/products/${item.product_id}.png`
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
                background: order.status === 'Paid' ? '#dcfce7' : order.status === 'Shipped' ? '#dbeafe' : order.status === 'cancelled' ? '#fee2e2' : '#fef9c3',
                color: order.status === 'Paid' ? '#166534' : order.status === 'Shipped' ? '#1e40af' : order.status === 'cancelled' ? '#dc2626' : '#854d0e'
              }"
            >
              สถานะ: {{ order.status === 'cancelled' ? 'ยกเลิกแล้ว' : order.status }}
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
                  @error="$event.target.src = 'https://placehold.co/100x100?text=Probiotic'"
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
              <strong :style="{ color: order.slip_image ? '#059669' : '#dc2626' }">
                {{ order.slip_image ? 'แนบสลิปแล้ว (รอตรวจสอบ)' : 'ยังไม่ชำระเงิน/ยังไม่แนบสลิป' }}
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
                🖨️ พิมพ์ใบเสร็จ
              </button>

              <!-- ปุ่มยกเลิกคำสั่งซื้อ -->
              <button 
                v-if="order.status.toLowerCase() === 'pending'"
                type="button"
                style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 0.85rem; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;"
                @click="cancelOrder(order.order_id)"
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

  <!-- Modal พิมพ์ใบเสร็จคำสั่งซื้อ (Receipt / Invoice) -->
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
        <div class="receipt-header">
          <div>
            <h2 style="margin: 0; color: #166534;">PROBIOTIC SHOP</h2>
            <small style="color: #64748b;">ใบเสร็จรับเงิน / คำสั่งซื้อ (Receipt & Order)</small>
          </div>
          <div style="text-align: right;">
            <strong style="font-size: 1.1rem; display: block;">#{{ currentReceiptOrder?.order_id }}</strong>
            <small style="color: #64748b;">{{ new Date(currentReceiptOrder?.created_at).toLocaleDateString('th-TH') }}</small>
          </div>
        </div>

        <div class="receipt-info">
          <div>
            <strong>ลูกค้า:</strong> {{ auth.user?.full_name || auth.user?.username }}<br />
            <strong>ที่อยู่จัดส่ง:</strong> {{ currentReceiptOrder?.shipping_address }}
          </div>
          <div style="text-align: right;">
            <strong>สถานะ:</strong> {{ currentReceiptOrder?.status }}<br />
            <strong>วิธีชำระเงิน:</strong> โอนผ่านธนาคาร
          </div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th style="text-align: left;">รายการ</th>
              <th style="text-align: center;">จำนวน</th>
              <th style="text-align: right;">ราคา</th>
              <th style="text-align: right;">รวม</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in currentReceiptOrder?.items" :key="item.order_item_id">
              <td>{{ item.product_name }}</td>
              <td style="text-align: center;">{{ item.quantity }}</td>
              <td style="text-align: right;">{{ money(item.price || (item.subtotal / item.quantity)) }}</td>
              <td style="text-align: right;">{{ money(item.subtotal) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold; border-top: 1px solid #cbd5e1;">ยอดรวมสุทธิ</td>
              <td style="text-align: right; font-weight: bold; color: #166534; font-size: 1.1rem; border-top: 1px solid #cbd5e1;">
                {{ money(currentReceiptOrder?.total_amount) }}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 1.5rem; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
          <small style="color: #64748b;">ขอบคุณที่ไว้วางใจเลือกใช้บริการผลิตภัณฑ์สุขภาพจาก Probiotic Shop</small>
        </div>
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
.receipt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
  padding: 1rem;
}

.receipt-card {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.receipt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.receipt-body {
  padding: 2rem;
  font-family: inherit;
  color: #1e293b;
}

.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #166534;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.receipt-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  background: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 6px;
}

.receipt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.receipt-table th {
  padding: 0.5rem;
  background: #f1f5f9;
  font-weight: 600;
  border-bottom: 1px solid #cbd5e1;
}

.receipt-table td {
  padding: 0.65rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

@media print {
  body * {
    visibility: hidden !important;
  }
  .receipt-modal-backdrop {
    position: static !important;
    background: none !important;
    padding: 0 !important;
  }
  .receipt-card {
    box-shadow: none !important;
    max-width: 100% !important;
    border-radius: 0 !important;
  }
  #printable-invoice, #printable-invoice * {
    visibility: visible !important;
  }
  #printable-invoice {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    padding: 1rem !important;
  }
  .print-hide {
    display: none !important;
  }
}
</style>