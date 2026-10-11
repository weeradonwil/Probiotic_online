<script setup>
import { ref, onMounted } from 'vue'
import { auth } from '../../auth'
import { money } from '../../format'
import Icon from '../../components/Icon.vue'

const orders = ref([])
const loading = ref(true)
const selectedSlip = ref(null)

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:3000/api/orders/admin/all', {
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

const updateStatus = async (orderId, status, paymentStatus) => {
  if (!confirm(`ยืนยันการเปลี่ยนสถานะคำสั่งซื้อ #${orderId} ?`)) return

  try {
    const res = await fetch(`http://localhost:3000/api/orders/admin/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        status,
        payment_status: paymentStatus
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    
    await fetchOrders()
  } catch (err) {
    alert(err.message || 'เกิดข้อผิดพลาดในการอัปเดต')
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h2>บันทึกและจัดการคำสั่งซื้อทั้งหมด</h2>
      <button class="button button-outline" @click="fetchOrders">รีเฟรชข้อมูล</button>
    </div>

    <div v-if="loading" class="panel empty-state">กำลังโหลดข้อมูล...</div>

    <div v-else-if="!orders.length" class="panel empty-state">
      <Icon name="cart" :size="48" />
      <p>ยังไม่มีคำสั่งซื้อในระบบ</p>
    </div>

    <div v-else class="panel" style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 0.75rem;">รหัส</th>
            <th style="padding: 0.75rem;">ลูกค้า</th>
            <th style="padding: 0.75rem;">รายการสินค้า</th>
            <th style="padding: 0.75rem;">ยอดรวม</th>
            <th style="padding: 0.75rem;">ที่อยู่จัดส่ง</th>
            <th style="padding: 0.75rem;">สลิป</th>
            <th style="padding: 0.75rem;">สถานะ</th>
            <th style="padding: 0.75rem;">การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.order_id" style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 0.75rem;">#{{ order.order_id }}</td>
            <td style="padding: 0.75rem;">
              <strong>{{ order.username }}</strong><br />
              <small style="color: #6b7280;">{{ order.phone || order.email }}</small>
            </td>
            <td style="padding: 0.75rem; font-size: 0.875rem;">
              <div v-for="item in order.items" :key="item.order_item_id">
                - {{ item.product_name }} x {{ item.quantity }}
              </div>
            </td>
            <td style="padding: 0.75rem;"><strong>{{ money(order.total_amount) }}</strong></td>
            <td style="padding: 0.75rem; max-width: 200px; font-size: 0.875rem;">{{ order.shipping_address }}</td>
            <td style="padding: 0.75rem;">
              <button 
                v-if="order.slip_image" 
                class="button button-outline" 
                style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
                @click="selectedSlip = `http://localhost:3000/uploads/slips/${order.slip_image}`"
              >
                ดูสลิป
              </button>
              <span v-else style="color: #9ca3af; font-size: 0.75rem;">ยังไม่แนบ</span>
            </td>
            <td style="padding: 0.75rem;">
              <span 
                style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;"
                :style="{
                  background: order.status === 'Paid' ? '#dcfce7' : order.status === 'Shipped' ? '#dbeafe' : '#fef9c3',
                  color: order.status === 'Paid' ? '#166534' : order.status === 'Shipped' ? '#1e40af' : '#854d0e'
                }"
              >
                {{ order.status }}
              </span>
            </td>
            <td style="padding: 0.75rem;">
              <div style="display: flex; gap: 0.25rem;">
                <button 
                  v-if="order.status === 'Pending'" 
                  class="button button-primary" 
                  style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
                  @click="updateStatus(order.order_id, 'Paid', 'Verified')"
                >
                  อนุมัติโอนเงิน
                </button>
                <button 
                  v-if="order.status === 'Paid'" 
                  class="button button-primary" 
                  style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: #2563eb;"
                  @click="updateStatus(order.order_id, 'Shipped', 'Verified')"
                >
                  จัดส่งแล้ว
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal ขยายรูปสลิป -->
    <div 
      v-if="selectedSlip" 
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem;"
      @click.self="selectedSlip = null"
    >
      <div style="background: white; padding: 1rem; border-radius: 8px; max-width: 500px; width: 100%; text-align: center;">
        <h3 style="margin-top: 0;">หลักฐานการโอนเงิน</h3>
        <img :src="selectedSlip" alt="สลิปโอนเงิน" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 4px; margin-bottom: 1rem;" />
        <div>
          <button class="button button-outline" @click="selectedSlip = null">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  </div>
</template>