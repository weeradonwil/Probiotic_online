import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './auth'

const routes = [
  { path: '/', component: () => import('./views/HomeView.vue') },
  { path: '/login', component: () => import('./views/LoginView.vue') },
  { path: '/register', component: () => import('./views/RegisterView.vue') },
  { path: '/products', component: () => import('./views/ProductsView.vue') },
  { path: '/about', component: () => import('./views/AboutView.vue') },
  { path: '/contact', component: () => import('./views/ContactView.vue') },
  { path: '/products/:id', component: () => import('./views/ProductDetailView.vue') },
  { path: '/cart', component: () => import('./views/CartView.vue') },
  { path: '/forgot-password', component: () => import('./views/ForgotPasswordView.vue') },
  { path: '/reset-password', component: () => import('./views/ResetPasswordView.vue') },
  // Layout และ guard ของ Admin สืบทอดให้ทุกหน้าลูก สิทธิ์จริงยังตรวจ JWT ที่ backend
  { path: '/admin', component: () => import('./views/admin/AdminLayout.vue'), meta: { admin: true, requiresAuth: true, requiresAdmin: true }, children: [
    { path: '', component: () => import('./views/admin/DashboardView.vue') },
    { path: 'products', component: () => import('./views/admin/AdminProductsView.vue') },
    { path: 'orders', component: () => import('./views/admin/RecordsView.vue'), props: { kind: 'orders' } },
    { path: 'payments', component: () => import('./views/admin/RecordsView.vue'), props: { kind: 'payments' } },
  ] },
  { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue') },
]

const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

// guard ฝั่งหน้าเว็บมีไว้เพื่อ UX เท่านั้น  สิทธิ์จริงถูกบังคับที่ backend (JWT + requireRole)
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) return '/products'
})

export default router
