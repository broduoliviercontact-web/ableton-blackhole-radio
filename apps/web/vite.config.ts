import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev : /api proxyé vers le backend Express.
      '/api': 'http://localhost:3001',
    },
  },
})