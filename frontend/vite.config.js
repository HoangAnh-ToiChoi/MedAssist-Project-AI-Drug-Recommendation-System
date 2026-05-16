import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cau hinh Vite cho MedAssist Frontend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy de tranh CORS khi dev
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    }
  }
})
