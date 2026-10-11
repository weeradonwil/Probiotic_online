<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Brand from './components/Brand.vue'
import Icon from './components/Icon.vue'
import { auth } from './auth'
import { cart } from './cart'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const userDropdownOpen = ref(false)
const search = ref('')

const navigation = [
  { label: 'หน้าแรก', to: '/' },
  { label: 'สินค้า', to: '/products' },
  { label: 'เกี่ยวกับเรา', to: '/about' },
  { label: 'ติดต่อเรา', to: '/contact' }
]

watch(() => route.fullPath, () => { 
  menuOpen.value = false 
  userDropdownOpen.value = false
})

function find() { 
  router.push({ path: '/products', query: search.value.trim() ? { q: search.value.trim() } : {} }) 
}

function handleProfileClick() {
  if (!auth.token) {
    router.push('/login')
  } else {
    userDropdownOpen.value = !userDropdownOpen.value
  }
}

function closeDropdownOnClickOutside(e) {
  const profileContainer = document.querySelector('.user-menu-container')
  if (profileContainer && !profileContainer.contains(e.target)) {
    userDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdownOnClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdownOnClickOutside)
})
</script>

<template>
  <RouterView v-if="route.meta.admin" />
  <div v-else class="site-layout">
    <header class="site-header">
      <div class="page-shell site-nav">
        <Brand />
        <nav id="mobile-navigation" :class="['main-links', { open: menuOpen }]" aria-label="เมนูหลัก">
          <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-link" exact-active-class="active">
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="header-actions">
          <form class="header-search" role="search" @submit.prevent="find">
            <button class="header-search-submit" type="submit" aria-label="ค้นหาสินค้า">
              <Icon name="search" :size="19" />
            </button>
            <input v-model="search" type="search" aria-label="คำค้นหาสินค้า" placeholder="ค้นหาสินค้า..." />
          </form>

          <!-- Dropdown Profile Menu -->
          <div class="user-menu-container" style="position: relative;">
            <button 
              class="icon-button" 
              :aria-label="auth.token ? 'เมนูผู้ใช้' : 'เข้าสู่ระบบ'"
              @click="handleProfileClick"
            >
              <Icon name="user" />
            </button>

            <!-- รายการเมนูใน Dropdown -->
            <div 
              v-if="userDropdownOpen && auth.token" 
              style="position: absolute; right: 0; top: 120%; width: 220px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 100; overflow: hidden; display: flex; flex-direction: column;"
            >
              <div style="padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; background: #f9fafb;">
                <div style="font-weight: 600; color: #111827; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ auth.user?.full_name || auth.user?.username }}
                </div>
                <div style="font-size: 0.75rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ auth.user?.email }}
                </div>
              </div>

              <RouterLink 
                to="/profile" 
                style="padding: 0.625rem 1rem; font-size: 0.875rem; color: #374151; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;"
                onmouseover="this.style.background='#f3f4f6'" 
                onmouseout="this.style.background='transparent'"
              >
                แก้ไขโปรไฟล์
              </RouterLink>

              <RouterLink 
                to="/my-orders" 
                style="padding: 0.625rem 1rem; font-size: 0.875rem; color: #374151; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;"
                onmouseover="this.style.background='#f3f4f6'" 
                onmouseout="this.style.background='transparent'"
              >
                ประวัติคำสั่งซื้อ
              </RouterLink>

              <RouterLink 
                v-if="auth.isAdmin" 
                to="/admin" 
                style="padding: 0.625rem 1rem; font-size: 0.875rem; color: #059669; font-weight: 500; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;"
                onmouseover="this.style.background='#ecfdf5'" 
                onmouseout="this.style.background='transparent'"
              >
                จัดการร้าน (Admin)
              </RouterLink>

              <button 
                style="padding: 0.625rem 1rem; font-size: 0.875rem; color: #dc2626; text-align: left; background: transparent; border: none; border-top: 1px solid #f3f4f6; cursor: pointer; transition: background 0.2s;"
                onmouseover="this.style.background='#fef2f2'" 
                onmouseout="this.style.background='transparent'"
                @click="auth.logout()"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>

          <!-- ตะกร้าสินค้า -->
          <RouterLink to="/cart" class="icon-button cart-link" :aria-label="'ตะกร้าสินค้า ' + cart.count + ' ชิ้น'">
            <Icon name="cart" />
            <span class="cart-badge" aria-hidden="true">{{ cart.count }}</span>
          </RouterLink>

          <button class="icon-button mobile-menu" :aria-expanded="menuOpen" aria-controls="mobile-navigation" aria-label="เปิดหรือปิดเมนู" @click="menuOpen = !menuOpen">
            <Icon :name="menuOpen ? 'close' : 'menu'" />
          </button>
        </div>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="page-shell footer-grid">
        <Brand />
        <div>
          <strong>เมนู</strong>
          <nav>
            <RouterLink v-for="item in navigation" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
          </nav>
        </div>
        <div>
          <strong>ผู้จัดทำโครงงาน</strong>
          <p>มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี</p>
          <RouterLink to="/contact" class="text-link">ข้อมูลติดต่อและสมาชิก →</RouterLink>
        </div>
        <div class="footer-motto">
          <Icon name="leaf" />
          <span>สุขภาพดี เริ่มได้ทุกวัน</span>
          <small>© {{ new Date().getFullYear() }} Probiotic Shop</small>
        </div>
      </div>
    </footer>

    <div v-if="cart.notice" class="toast" role="status">
      <Icon name="check" />
      {{ cart.notice }}
      <button aria-label="ปิดข้อความ" @click="cart.notice = ''">
        <Icon name="close" :size="17" />
      </button>
    </div>
  </div>
</template>