import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './auth'

const routes = [
  { path: '/', component: () => import('./views/HomeView.vue') },
  { path: '/login', component: () => import('./views/LoginView.vue') },
  { path: '/register', component: () => import('./views/RegisterView.vue') },
  { path: '/products', component: () => import('./views/ProductsView.vue'), meta: { requiresAuth: true } },
  // หน้า Admin (ยังไม่ทำ) ใส่ meta: { requiresAuth: true, requiresAdmin: true }
]

const router = createRouter({ history: createWebHistory(), routes })

// guard ฝั่งหน้าเว็บมีไว้เพื่อ UX เท่านั้น  สิทธิ์จริงถูกบังคับที่ backend (JWT + requireRole)
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) return '/products'
})

export default router