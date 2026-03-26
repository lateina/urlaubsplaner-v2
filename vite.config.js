import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      // Using manual manifests from public folder
      manifest: false, 
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-*.png'],
    })
  ],
  base: './', 
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        assistenz: resolve(__dirname, 'assistenz.html'),
      },
    },
  },
})
