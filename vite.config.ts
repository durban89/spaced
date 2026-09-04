import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? './' : '/spaced/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
  },
})
