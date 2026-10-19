<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageBanner from '../components/PageBanner.vue'
import ProductImage from '../components/ProductImage.vue'
import Icon from '../components/Icon.vue'
import { cart } from '../cart'
import { auth } from '../auth'
import { money } from '../format'

const router = useRouter()
const shippingAddress = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

// สถานะการชำระเงิน
const createdOrder = ref(null)
const slipFile = ref(null)
const phoneNumber = ref('')
const isUploadingSlip = ref(false)
const paySuccess = ref(false)

// State สำหรับ Custom Alert Modal สวยๆ
const alertModal = ref({
  open: false,
  title: '',
  message: '',
  type: 'warning' // 'warning', 'error', 'success'
})

const showAlert = (title, message, type = 'warning') => {
  alertModal.value = {
    open: true,
    title,
    message,
    type
  }
}

const closeAlert = () => {
  alertModal.value.open = false
}

// Saved Address: ดึงที่อยู่จัดส่งล่าสุดที่บันทึกไว้ในเครื่อง
onMounted(() => {
  const saved = localStorage.getItem('last_shipping_address')
  if (saved) {
    shippingAddress.value = saved
  }
})

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (file) slipFile.value = file
}

// ฟังก์ชันกรองเฉพาะตัวเลขและจำกัดไม่เกิน 10 หลัก
const handlePhoneInput = (e) => {
  const onlyDigits = e.target.value.replace(/\D/g, '')
  phoneNumber.value = onlyDigits.slice(0, 10)
}

const checkout = async () => {
  if (!auth.token) {
    router.push('/login?redirect=/cart')
    return
  }

  if (!shippingAddress.value.trim()) {
    errorMessage.value = 'กรุณาระบุที่อยู่จัดส่งสินค้า'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      shipping_address: shippingAddress.value.trim(),
      items: cart.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
    }

    const res = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ')
    }

    // จดจำที่อยู่จัดส่งล่าสุดสำหรับครั้งต่อไป
    localStorage.setItem('last_shipping_address', shippingAddress.value.trim())

    createdOrder.value = data
    cart.clear()
  } catch (err) {
    errorMessage.value = err.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ'
  } finally {
    isSubmitting.value = false
  }
}

const submitPayment = async () => {
  // ตรวจสอบความถูกต้องของเบอร์โทรศัพท์
  if (phoneNumber.value) {
    const phoneClean = phoneNumber.value.trim()
    if (!/^0[0-9]{8,9}$/.test(phoneClean)) {
      showAlert(
        'เบอร์โทรศัพท์ไม่ถูกต้อง',
        'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (ต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0)',
        'warning'
      )
      return
    }
  }

  if (!slipFile.value) {
    showAlert(
      'ยังไม่ได้แนบสลิป',
      'กรุณาแนบรูปสลิปหลักฐานการโอนเงินก่อนแจ้งชำระเงิน',
      'warning'
    )
    return
  }

  isUploadingSlip.value = true
  try {
    const formData = new FormData()
    formData.append('slip', slipFile.value)
    if (phoneNumber.value) formData.append('phone', phoneNumber.value)
    formData.append('payment_method', 'Bank Transfer')

    const res = await fetch(`http://localhost:3000/api/orders/${createdOrder.value.order_id}/pay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.token}`
      },
      body: formData
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'แนบสลิปไม่สำเร็จ')

    paySuccess.value = true
  } catch (err) {
    showAlert('เกิดข้อผิดพลาด', err.message || 'อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error')
  } finally {
    isUploadingSlip.value = false
  }
}
</script>

<template>
  <PageBanner title="ตะกร้าสินค้า" subtitle="ตรวจสอบสินค้าที่คุณเลือกและสั่งซื้อได้ที่นี่" />
  
  <section class="page-shell section">
    <!-- กรณีชำระเงินเรียบร้อยแล้ว -->
    <div v-if="paySuccess" class="panel empty-state">
      <Icon name="check" :size="48" style="color: #10b981;" />
      <h2>แจ้งชำระเงินเรียบร้อยแล้ว</h2>
      <p>ระบบได้รับข้อมูลคำสั่งซื้อ #{{ createdOrder.order_id }} และสลิปของคุณแล้ว เจ้าหน้าที่จะทำการตรวจสอบและจัดส่งสินค้า</p>
      
      <!-- ปุ่มเลือกชมสินค้า และ ปุ่มไปประวัติคำสั่งซื้อ วางเคียงข้างกัน -->
      <div style="display: flex; gap: 0.75rem; justify-content: center; align-items: center; flex-wrap: wrap; margin-top: 1.25rem;">
        <RouterLink to="/products" class="button button-outline">
          เลือกชมสินค้าเพิ่มเติม
        </RouterLink>
        <RouterLink to="/my-orders" class="button button-primary" style="display: flex; align-items: center; gap: 0.35rem;">
          📦 ดูประวัติคำสั่งซื้อ
        </RouterLink>
      </div>
    </div>

    <!-- กรณียืนยันคำสั่งซื้อสำเร็จ แต่ยังไม่ได้แนบสลิป -->
    <div v-else-if="createdOrder" class="panel" style="max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669; margin-bottom: 0.5rem;">สั่งซื้อสำเร็จ! รหัสคำสั่งซื้อ #{{ createdOrder.order_id }}</h2>
      <p style="margin-bottom: 1.5rem;">ยอดชำระทั้งหมด: <strong>{{ money(createdOrder.total_amount) }}</strong></p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin-top: 0; color: #166534;">ช่องทางการโอนเงิน</h4>
        <p style="margin: 0.25rem 0;">ธนาคารกสิกรไทย (KBANK)</p>
        <p style="margin: 0.25rem 0;">เลขที่บัญชี: <strong>123-4-56789-0</strong></p>
        <p style="margin: 0.25rem 0;">ชื่อบัญชี: บจก. โปรไบโอติก ช็อป</p>
      </div>

      <form @submit.prevent="submitPayment" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <label style="font-weight: 500;">เบอร์โทรศัพท์ติดต่อ</label>
            <span style="font-size: 0.75rem; color: #6b7280;">{{ phoneNumber.length }}/10 หลัก</span>
          </div>
          <!-- บังคับพิมพ์เฉพาะตัวเลข และความยาวไม่เกิน 10 หลัก -->
          <input 
            :value="phoneNumber" 
            @input="handlePhoneInput"
            type="tel" 
            inputmode="numeric"
            maxlength="10"
            placeholder="08XXXXXXXX" 
            class="input" 
            style="width: 100%;" 
          />
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">แนบสลิปการโอนเงิน *</label>
          <input type="file" accept="image/*" required @change="handleFileChange" />
        </div>

        <button type="submit" class="button button-primary" :disabled="isUploadingSlip">
          {{ isUploadingSlip ? 'กำลังส่งข้อมูล...' : 'แจ้งชำระเงิน' }}
        </button>
      </form>
    </div>

    <!-- ตะกร้าว่างเปล่า -->
    <div v-else-if="!cart.items.length" class="panel empty-state">
      <Icon name="cart" :size="48" />
      <h2>ตะกร้าของคุณยังว่าง</h2>
      <RouterLink to="/products" class="button button-primary">เลือกชมสินค้า <Icon name="arrow" /></RouterLink>
    </div>

    <!-- ตารางตะกร้าสินค้าปกติ -->
    <div v-else class="cart-grid">
      <div class="panel">
        <article v-for="item in cart.items" :key="item.product_id" class="cart-row">
          <ProductImage :product="item" />
          <div>
            <RouterLink :to="'/products/' + item.product_id">
              <h3>{{ item.name }}</h3>
            </RouterLink>
            <span class="product-price">{{ money(item.price) }}</span>
            <label class="quantity-field">
              จำนวน
              <input
                type="number"
                min="1"
                :max="item.stock"
                :value="item.quantity"
                @change="cart.update(item.product_id, $event.target.value)"
              />
            </label>
          </div>
          <button class="icon-button danger" :aria-label="'ลบ ' + item.name" @click="cart.remove(item.product_id)">
            <Icon name="trash" />
          </button>
        </article>
      </div>

      <aside class="panel cart-summary">
        <h2>สรุปคำสั่งซื้อ</h2>
        <div><span>จำนวนสินค้า</span><strong>{{ cart.count }} ชิ้น</strong></div>
        <div><span>ยอดรวม</span><strong>{{ money(cart.total) }}</strong></div>

        <div style="margin-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <label style="font-weight: 600; font-size: 0.95rem;">ที่อยู่จัดส่งสินค้า *</label>
            <span v-if="shippingAddress" style="font-size: 0.75rem; color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">
              ✓ ใช้ที่อยู่ล่าสุด
            </span>
          </div>
          <textarea
            v-model="shippingAddress"
            rows="3"
            placeholder="กรอกชื่อ-นามสกุล ที่อยู่ และเบอร์โทรศัพท์สำหรับจัดส่ง..."
            style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db; resize: vertical; font-family: inherit;"
          ></textarea>
        </div>

        <p v-if="errorMessage" style="color: #ef4444; margin-top: 0.5rem; font-size: 0.875rem;">
          {{ errorMessage }}
        </p>

        <button
          v-if="auth.token"
          class="button button-primary"
          style="margin-top: 1rem; width: 100%;"
          :disabled="isSubmitting"
          @click="checkout"
        >
          {{ isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการสั่งซื้อ' }}
        </button>
        <RouterLink v-else to="/login?redirect=/cart" class="button button-primary" style="margin-top: 1rem;">
          เข้าสู่ระบบเพื่อสั่งซื้อ <Icon name="arrow" />
        </RouterLink>
        <RouterLink to="/products" class="button button-outline">เลือกสินค้าเพิ่มเติม</RouterLink>
      </aside>
    </div>
  </section>

  <!-- Custom Alert Modal (แจ้งเตือนสวยงามแทน alert เบราว์เซอร์) -->
  <div 
    v-if="alertModal.open" 
    class="custom-alert-backdrop"
    @click.self="closeAlert"
  >
    <div class="custom-alert-card">
      <div 
        class="alert-icon-circle"
        :class="alertModal.type"
      >
        <svg v-if="alertModal.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>

      <h3 style="margin: 0.5rem 0 0.5rem 0; font-size: 1.25rem; color: #111827; font-weight: 700;">
        {{ alertModal.title }}
      </h3>

      <p style="margin: 0; color: #6b7280; font-size: 0.95rem; line-height: 1.5;">
        {{ alertModal.message }}
      </p>

      <div style="margin-top: 1.5rem;">
        <button 
          type="button" 
          class="btn-alert-ok"
          @click="closeAlert"
        >
          ตกลง
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* สไตล์กล่องแจ้งเตือนสวยงาม (Custom Alert Modal) */
.custom-alert-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1.25rem;
  animation: fadeIn 0.2s ease-out;
}

.custom-alert-card {
  background: white;
  border-radius: 16px;
  max-width: 400px;
  width: 100%;
  padding: 1.75rem 1.5rem;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.alert-icon-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem auto;
}

.alert-icon-circle.warning {
  background: #fef3c7;
  color: #d97706;
}

.alert-icon-circle.error {
  background: #fee2e2;
  color: #dc2626;
}

.btn-alert-ok {
  width: 100%;
  background: #166534;
  color: white;
  border: none;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(22, 101, 52, 0.2);
  transition: all 0.15s;
}

.btn-alert-ok:hover {
  background: #14532d;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>