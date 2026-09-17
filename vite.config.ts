import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? './' : '/spaced/',
  plugins: [react()],
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version || 'dev'),
    'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
})
