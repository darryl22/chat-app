import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': "http://localhost:3000",
      // '/api': "https://a25a-2001-4958-3c36-2b01-9c9-4351-e043-8b3d.ngrok-free.app",
      // 'api': import.meta.env.VITE_BACKEND_URL
    },
    allowedHosts: ["8624-2001-4958-3c36-2b01-9c9-4351-e043-8b3d.ngrok-free.app", "http://10.0.0.180:5173"],
    // host: true,
    // hmr: {
    //   clientPort: 443
    // }
  }
})
