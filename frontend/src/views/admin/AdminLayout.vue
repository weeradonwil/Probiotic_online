<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Brand from '../../components/Brand.vue'
import Icon from '../../components/Icon.vue'
import { auth } from '../../auth'

const route = useRoute(), open = ref(false)
const links = [
  { to: '/admin', label: 'Dashboard', icon: 'grid' },
  { to: '/admin/products', label: 'จัดการสินค้า', icon: 'box' },
  { to: '/admin/orders', label: 'คำสั่งซื้อ', icon: 'order' }
]

watch(() => route.path, () => { open.value = false })
</script>

<template>
  <div class="admin-shell">
    <button v-if="open" class="sidebar-backdrop" aria-label="ปิดเมนู" @click="open = false"></button>
    <aside :class="['admin-sidebar', { open }]">
      <Brand admin />
      <nav aria-label="เมนูผู้ดูแล">
        <RouterLink v-for="item in links" :key="item.to" :to="item.to" exact-active-class="active">
          <Icon :name="item.icon" /><span class="admin-nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="admin-sidebar-bottom">
        <RouterLink to="/"><Icon name="leaf" /><span class="admin-nav-label">กลับหน้าร้าน</span></RouterLink>
        <button @click="auth.logout()"><Icon name="logout" /><span class="admin-nav-label">ออกจากระบบ</span></button>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="icon-button mobile-menu" aria-label="เปิดเมนูผู้ดูแล" :aria-expanded="open" @click="open = !open">
          <Icon name="menu" />
        </button>
        <div>
          <span class="eyebrow">STORE MANAGEMENT</span>
          <h1>{{ links.find(item => item.to === route.path)?.label || 'จัดการร้าน' }}</h1>
        </div>
        <div class="admin-user">
          <span class="circle-icon"><Icon name="user" /></span>
          <span>
            <strong>{{ auth.user?.full_name || auth.user?.username || 'Admin' }}</strong>
            <small>ผู้ดูแล Probiotic Shop</small>
          </span>
        </div>
      </header>
      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>