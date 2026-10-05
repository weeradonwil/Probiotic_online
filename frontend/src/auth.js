import { reactive } from 'vue'

const saved = JSON.parse(localStorage.getItem('session') || 'null')

export const auth = reactive({
  token: saved?.token || null,
  user: saved?.user || null,
  get isAdmin() {
    return this.user?.role === 'Admin'
  },
  setSession(token, user) {
    this.token = token
    this.user = user
    localStorage.setItem('session', JSON.stringify({ token, user }))
  },
  logout() {
    this.token = null
    this.user = null
    localStorage.removeItem('session')
    location.href = '/login'
  },
})