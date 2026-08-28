import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function injectFcmConfig(): Plugin {
  return {
    name: 'inject-fcm-config',
    apply: 'build',
    closeBundle() {
      const dir = fileURLToPath(new URL('.', import.meta.url))
      const env = loadEnv('', dir, '')
      const keys = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
      ]
      const templatePath = resolve(dir, 'firebase-messaging-sw.template.js')
      const outputPath = resolve(dir, 'dist', 'firebase-messaging-sw.js')
      let content = readFileSync(templatePath, 'utf-8')
      for (const key of keys) {
        content = content.replaceAll(`__${key}__`, JSON.stringify(env[key] ?? ''))
      }
      writeFileSync(outputPath, content)

      const manifestPath = resolve(dir, 'dist', 'manifest.json')
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        manifest.gcm_sender_id = env.VITE_FIREBASE_MESSAGING_SENDER_ID || '103953800507'
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      } catch {
        // manifest not built
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/spaced/',
  plugins: [react(), injectFcmConfig()],
  build: {
    chunkSizeWarningLimit: 600,
  },
})