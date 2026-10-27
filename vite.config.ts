/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// La app se publica en una subcarpeta (GitHub Pages: https://odam-git.github.io/Mi-Frances-/),
// por eso todas las rutas son relativas (base './').
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'MI FRANCÉS',
        short_name: 'Mi Francés',
        description: 'Tu entrenador personal de francés: memoria visual, repasos espaciados y práctica diaria.',
        lang: 'es-MX',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f1e7',
        theme_color: '#1d2a44',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ],
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] }
});
