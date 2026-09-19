import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const appBase = command === 'serve' ? '/' : '/ginkaraoke/'
  return {
  base: appBase,
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router)/ },
            { name: 'icons', test: /node_modules[\\/]lucide-react/ }
          ]
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'GinKaraoke - Hát Cùng Nhau',
        short_name: 'GinKaraoke',
        description: 'Ứng dụng tìm bài hát chung và đề xuất playlist Karaoke thông minh cho nhóm bạn',
        lang: 'vi',
        theme_color: '#0f172a',
        background_color: '#0b0f19',
        display: 'standalone',
        orientation: 'portrait',
        scope: appBase,
        start_url: `${appBase}#/`,
        icons: [
          {
            src: `${appBase}pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: `${appBase}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: `${appBase}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        navigateFallback: `${appBase}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ]
  }
})
