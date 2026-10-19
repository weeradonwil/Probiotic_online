<script setup>
import { ref, onMounted } from 'vue'
import PageBanner from '../components/PageBanner.vue'
import Icon from '../components/Icon.vue'
import { auth } from '../auth'

const fullName = ref('')
const newPassword = ref('')
const isSubmitting = ref(false)
const message = ref('')
const errorMessage = ref('')

onMounted(() => {
  if (auth.user) fullName.value = auth.user.full_name || ''
})

const updateProfile = async () => {
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const res = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        full_name: fullName.value,
        password: newPassword.value || undefined
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง')

    message.value = data.message
    newPassword.value = ''

    if (data.user) {
      auth.user = data.user
      localStorage.setItem('probiotic-user', JSON.stringify(data.user))
    }
  } catch (err) {
    errorMessage.value = err.message || 'บันทึกข้อมูลไม่สำเร็จ'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <PageBanner title="แก้ไขข้อมูลโปรไฟล์" subtitle="จัดการข้อมูลส่วนตัวและรหัสผ่านของคุณ" />

  <section class="page-shell section profile-section">
    <div class="panel profile-card">
      <header class="profile-card-heading">
        <span class="profile-avatar"><Icon name="user" :size="25" /></span>
        <div>
          <span class="profile-eyebrow">บัญชีของฉัน</span>
          <h2 id="profile-title">ข้อมูลบัญชีผู้ใช้</h2>
          <p>อัปเดตข้อมูลที่ใช้แสดงในบัญชีของคุณ</p>
        </div>
      </header>

      <p v-if="message" class="profile-alert success" role="status" aria-live="polite">
        <Icon name="check" :size="19" />{{ message }}
      </p>
      <p v-if="errorMessage" class="profile-alert error" role="alert">
        <Icon name="close" :size="19" />{{ errorMessage }}
      </p>

      <form class="profile-form" aria-labelledby="profile-title" @submit.prevent="updateProfile">
        <section class="profile-block" aria-labelledby="account-details-title">
          <div class="profile-block-heading">
            <h3 id="account-details-title">ข้อมูลส่วนตัว</h3>
            <p>ข้อมูลบัญชีที่ใช้ระบุตัวตนของคุณ</p>
          </div>

          <div class="profile-fields">
            <label class="profile-field">
              <span>ชื่อผู้ใช้ <small>Username</small></span>
              <input class="profile-input readonly" type="text" :value="auth.user?.username" disabled />
              <small class="profile-hint">ชื่อผู้ใช้นี้ไม่สามารถเปลี่ยนได้</small>
            </label>

            <label class="profile-field">
              <span>อีเมล <small>Email</small></span>
              <input class="profile-input readonly" type="email" :value="auth.user?.email" disabled />
              <small class="profile-hint">ใช้สำหรับติดต่อและกู้คืนบัญชี</small>
            </label>

            <label class="profile-field full-width">
              <span>ชื่อที่ใช้แสดง <b aria-hidden="true">*</b></span>
              <input
                v-model="fullName"
                class="profile-input"
                type="text"
                autocomplete="name"
                maxlength="100"
                required
                placeholder="กรอกชื่อที่ต้องการให้แสดง"
              />
            </label>
          </div>
        </section>

        <section class="profile-block security-block" aria-labelledby="security-title">
          <div class="profile-block-heading">
            <h3 id="security-title"><Icon name="lock" :size="18" />ความปลอดภัย</h3>
            <p>กรอกรหัสผ่านใหม่เฉพาะเมื่อต้องการเปลี่ยนรหัสผ่าน</p>
          </div>
          <label class="profile-field">
            <span>รหัสผ่านใหม่</span>
            <input
              v-model="newPassword"
              class="profile-input"
              type="password"
              autocomplete="new-password"
              placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยน"
            />
          </label>
        </section>

        <footer class="profile-form-footer">
          <p><Icon name="shield" :size="17" />ข้อมูลโปรไฟล์ของคุณจะถูกจัดเก็บอย่างปลอดภัย</p>
          <button type="submit" class="button button-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
            <Icon v-if="!isSubmitting" name="arrow" :size="18" />
          </button>
        </footer>
      </form>
    </div>
  </section>
</template>

<style scoped>
.profile-section { padding-top: 28px; padding-bottom: 48px; }
.profile-card { width: min(820px, 100%); margin-inline: auto; padding: 30px 34px; border-radius: 20px; }
.profile-card-heading { display: flex; align-items: center; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
.profile-avatar { display: grid; place-items: center; width: 54px; height: 54px; flex: 0 0 54px; border-radius: 16px; color: var(--green); background: #e7f7ec; }
.profile-eyebrow { color: #31804f; font-size: .75rem; font-weight: 700; letter-spacing: .04em; }
.profile-card-heading h2 { margin: 3px 0; font-size: 1.45rem; }
.profile-card-heading p, .profile-block-heading p { margin: 0; font-size: .84rem; }
.profile-alert { display: flex; align-items: center; gap: 10px; padding: 13px 15px; margin: 20px 0 0; border: 1px solid transparent; border-radius: 12px; font-size: .87rem; }
.profile-alert.success { color: #087443; background: #effaf3; border-color: #d2efdc; }
.profile-alert.error { color: #b42332; background: #fff4f3; border-color: #f7d6d4; }
.profile-alert :deep(svg) { flex: 0 0 auto; }
.profile-form { display: grid; gap: 24px; padding-top: 24px; }
.profile-block { min-width: 0; padding: 0; margin: 0; border: 0; }
.profile-block-heading { margin-bottom: 16px; }
.profile-block-heading h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; color: var(--deep); font-size: 1rem; }
/* Keep the immutable account identifiers side by side and let editable name use the full row. */
.profile-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 16px; }
.profile-field { display: grid; gap: 7px; min-width: 0; color: var(--deep); font-size: .86rem; font-weight: 600; }
.profile-field > span small { color: var(--muted); font-size: .78rem; font-weight: 400; }
.profile-field b { color: #d34141; }
.profile-input { width: 100%; min-width: 0; min-height: 46px; padding: 10px 13px; border: 1px solid #d5e2da; border-radius: 10px; outline: none; color: #173c2c; background: #fff; transition: border-color .15s, box-shadow .15s, background .15s; }
.profile-input:focus { border-color: #4b9b6b; box-shadow: 0 0 0 3px #16834d1a; }
.profile-input::placeholder { color: #929da4; font-weight: 400; }
.profile-input.readonly { color: #65736d; background: #f5f8f6; cursor: not-allowed; }
.profile-hint { color: #78877e; font-size: .73rem; font-weight: 400; }
.full-width { grid-column: 1 / -1; }
.security-block { padding: 20px; border: 1px solid #e3eee7; border-radius: 14px; background: #f9fcfa; }
.security-block .profile-field { max-width: 520px; }
.profile-form-footer { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 20px; border-top: 1px solid var(--border); }
.profile-form-footer p { display: flex; align-items: center; gap: 7px; margin: 0; color: #718078; font-size: .75rem; }
.profile-form-footer p :deep(svg) { flex: 0 0 auto; color: #45885d; }
.profile-form-footer .button { min-width: 230px; }

@media (max-width: 600px) {
  /* Stack profile controls on phones so inputs keep a comfortable tap target width. */
  .profile-section { padding-top: 20px; padding-bottom: 30px; }
  .profile-card { padding: 22px 18px; border-radius: 16px; }
  .profile-card-heading { align-items: flex-start; gap: 12px; padding-bottom: 19px; }
  .profile-avatar { width: 46px; height: 46px; flex-basis: 46px; border-radius: 13px; }
  .profile-card-heading h2 { font-size: 1.25rem; }
  .profile-fields { grid-template-columns: minmax(0, 1fr); gap: 15px; }
  .full-width { grid-column: auto; }
  .security-block { padding: 16px; }
  .profile-form-footer { align-items: stretch; flex-direction: column; }
  .profile-form-footer .button { width: 100%; }
}
</style>
