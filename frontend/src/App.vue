<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Brand from './components/Brand.vue'
import Icon from './components/Icon.vue'
import { auth } from './auth'
import { cart } from './cart'
const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const search = ref('')
const navigation = [{ label: 'หน้าแรก', to: '/' }, { label: 'สินค้า', to: '/products' }, { label: 'เกี่ยวกับเรา', to: '/about' }, { label: 'ติดต่อเรา', to: '/contact' }]
watch(() => route.fullPath, () => { menuOpen.value = false })
// เมนูค้นหานำไปหน้าสินค้าพร้อม query ที่ bookmark และย้อนกลับได้
function find() { router.push({ path: '/products', query: search.value.trim() ? { q: search.value.trim() } : {} }) }
</script>
<template>
  <RouterView v-if="route.meta.admin" />
  <div v-else class="site-layout">
    <header class="site-header"><div class="page-shell site-nav">
      <Brand />
      <nav id="mobile-navigation" :class="['main-links', { open: menuOpen }]" aria-label="เมนูหลัก">
        <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-link" exact-active-class="active">{{ item.label }}</RouterLink>
      </nav>
      <div class="header-actions">
        <form class="header-search" role="search" @submit.prevent="find">
          <button class="header-search-submit" type="submit" aria-label="ค้นหาสินค้า"><Icon name="search" :size="19" /></button>
          <input v-model="search" type="search" aria-label="คำค้นหาสินค้า" placeholder="ค้นหาสินค้า..." />
        </form>
        <RouterLink :to="auth.token && auth.isAdmin ? '/admin' : '/login'" class="icon-button" :aria-label="auth.token ? 'บัญชีผู้ใช้' : 'เข้าสู่ระบบ'"><Icon name="user" /></RouterLink>
        <!-- จำนวนสินค้าแสดงข้างไอคอนแทนการซ้อน เพื่อให้อ่านชัดทั้งหนึ่งและหลายหลัก -->
        <RouterLink to="/cart" class="icon-button cart-link" :aria-label="'ตะกร้าสินค้า ' + cart.count + ' ชิ้น'"><Icon name="cart" /><span class="cart-badge" aria-hidden="true">{{ cart.count }}</span></RouterLink>
        <button class="icon-button mobile-menu" :aria-expanded="menuOpen" aria-controls="mobile-navigation" aria-label="เปิดหรือปิดเมนู" @click="menuOpen = !menuOpen"><Icon :name="menuOpen ? 'close' : 'menu'" /></button>
      </div>
    </div><div v-if="auth.token" class="account-strip page-shell"><span>{{ auth.user?.full_name || auth.user?.username }}</span><RouterLink v-if="auth.isAdmin" to="/admin">จัดการร้าน</RouterLink><button @click="auth.logout()">ออกจากระบบ</button></div>
    </header>
    <main class="site-main"><RouterView /></main>
    <footer class="site-footer"><div class="page-shell footer-grid">
      <Brand /><div><strong>เมนู</strong><nav><RouterLink v-for="item in navigation" :key="item.to" :to="item.to">{{ item.label }}</RouterLink></nav></div>
      <div><strong>ผู้จัดทำโครงงาน</strong><p>มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี</p><RouterLink to="/contact" class="text-link">ข้อมูลติดต่อและสมาชิก →</RouterLink></div>
      <div class="footer-motto"><Icon name="leaf" /><span>สุขภาพดี เริ่มได้ทุกวัน</span><small>© {{ new Date().getFullYear() }} Probiotic Shop</small></div>
    </div></footer>
    <div v-if="cart.notice" class="toast" role="status"><Icon name="check" />{{ cart.notice }}<button aria-label="ปิดข้อความ" @click="cart.notice = ''"><Icon name="close" :size="17" /></button></div>
  </div>
</template>
