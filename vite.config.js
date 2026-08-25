import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'icons/pwa-192x192.png',
        'icons/pwa-512x512.png',
        'icons/maskable-icon-192x192.png',
        'icons/maskable-icon-512x512.png',
        'icons/apple-touch-icon.png',
        'LOGO_OFICIAL_BLANCO.png',
        'LOGO_OFICIAL.png',
        'favicon.png',
        'favicon.svg',
        'robots.txt'
      ],
      manifest: {
        id: '/',
        name: 'Madrigales Pastelería',
        short_name: 'Madrigales',
        description: 'Sistema de gestión y punto de venta de Madrigales Pastelería',
        lang: 'es-HN',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: [
          'window-controls-overlay',
          'standalone',
          'minimal-ui'
        ],
        theme_color: '#7C3AED',
        background_color: '#FFFFFF',
        orientation: 'portrait-primary',
        categories: ['business', 'productivity', 'food'],
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/olmzeebxhpvettrrtbet\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache-v3',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
