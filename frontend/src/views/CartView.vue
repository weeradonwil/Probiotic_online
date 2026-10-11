<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageBanner from '../components/PageBanner.vue'
import ProductImage from '../components/ProductImage.vue'
import Icon from '../components/Icon.vue'
import { cart } from '../cart'
import { auth } from '../auth'
import { money } from '../format'
import { api } from '../api'

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

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (file) slipFile.value = file
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

    // เรียก API ตรงด้วย fetch พร้อมส่ง Header Authorization และ Content-Type ที่ถูกต้อง
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

    createdOrder.value = data
    cart.clear()
  } catch (err) {
    errorMessage.value = err.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ'
  } finally {
    isSubmitting.value = false
  }
}

const submitPayment = async () => {
  if (!slipFile.value) {
    alert('กรุณาแนบรูปสลิปหลักฐานการโอน')
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
    alert(err.message || 'อัปโหลดสลิปไม่สำเร็จ')
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
      <RouterLink to="/products" class="button button-primary">เลือกชมสินค้าเพิ่มเติม</RouterLink>
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
          <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">เบอร์โทรศัพท์ติดต่อ</label>
          <input v-model="phoneNumber" type="tel" placeholder="08X-XXX-XXXX" class="input" style="width: 100%;" />
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
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">ที่อยู่จัดส่งสินค้า *</label>
          <textarea
            v-model="shippingAddress"
            rows="3"
            placeholder="กรอกชื่อ-นามสกุล ที่อยู่ และเบอร์โทรศัพท์สำหรับจัดส่ง..."
            style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db; resize: vertical;"
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
</template>