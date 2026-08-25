import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['LOGO_OFICIAL.png', 'robots.txt'],
      manifest: {
        name: 'Madrigales Pastelería',
        short_name: 'Madrigales',
        description: 'Sistema de gestión y punto de venta para Madrigales Pastelería',
        theme_color: '#2C1536',
        background_color: '#FAF7F9',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: '/LOGO_OFICIAL.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/LOGO_OFICIAL.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/LOGO_OFICIAL.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/olmzeebxhpvettrrtbet\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'recharts',
      'zustand',
      'react-hot-toast',
      'zod',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'date-fns',
      'date-fns/locale',
      'jspdf',
      'jspdf-autotable',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || __dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
