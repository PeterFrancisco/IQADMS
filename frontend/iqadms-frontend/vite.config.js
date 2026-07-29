import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.VITE_BUILD_ID || new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __IQADMS_BUILD__: JSON.stringify(buildId)
  }
})
