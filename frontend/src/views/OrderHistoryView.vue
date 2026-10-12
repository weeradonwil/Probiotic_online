<script setup>
import { ref, onMounted } from 'vue'
import PageBanner from '../components/PageBanner.vue'
import Icon from '../components/Icon.vue'
import { auth } from '../auth'
import { money } from '../format'

const orders = ref([])
const loading = ref(true)
const payOrderId = ref(null)
const slipFile = ref(null)
const phoneNumber = ref('')
const isUploading = ref(false)

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

onMounted(() => {
  fetchMyOrders()
})
</script>

<template>
  <PageBanner title="ประวัติการสั่งซื้อ" subtitle="ติดตามสถานะคำสั่งซื้อและรายการสินค้าของคุณ" />

  <section class="page-shell section">
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

        <div style="margin-bottom: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0;">รายการสินค้า</h4>
          <div v-for="item in order.items" :key="item.order_item_id" style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
            <span>{{ item.product_name }} x {{ item.quantity }}</span>
            <strong>{{ money(item.subtotal) }}</strong>
          </div>
        </div>

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
            
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <!-- ปุ่มยกเลิกคำสั่งซื้อ (แสดงเฉพาะตอนที่ยังเป็น Pending หรือยังไม่จัดส่ง) -->
              <button 
                v-if="order.status.toLowerCase() === 'pending'"
                type="button"
                style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 0.85rem; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; transition: background 0.2s;"
                onmouseover="this.style.background='#fecaca'"
                onmouseout="this.style.background='#fee2e2'"
                @click="cancelOrder(order.order_id)"
              >
                ยกเลิกคำสั่งซื้อ
              </button>

              <!-- ปุ่มแนบสลิปโอนเงิน -->
              <button 
                v-if="order.status.toLowerCase() === 'pending' && !order.slip_image" 
                class="button button-primary" 
                style="font-size: 0.875rem; padding: 0.25rem 0.75rem;"
                @click="payOrderId = order.order_id"
              >
                แนบสลิปโอนเงิน
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Modal แนบสลิปย้อนหลัง -->
    <div 
      v-if="payOrderId" 
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
  </section>
</template>