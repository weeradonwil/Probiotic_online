import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// proxy /api ไป backend จึงไม่ติดปัญหา CORS ตอนพัฒนา
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
})