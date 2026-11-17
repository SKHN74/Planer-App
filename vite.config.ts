/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serviert die App unter /planer-app/. Lokal kann BASE_PATH=/ gesetzt werden.
const base = process.env.BASE_PATH ?? '/planer-app/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Planer',
        short_name: 'Planer',
        description: 'Kalender, To-dos, Sport und Ziele. Alle Daten bleiben auf dem Gerät.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F5F7',
        theme_color: '#F4F5F7',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] }
    })
  ],
  test: {
    environment: 'node',
    setupFiles: ['src/test-setup.ts']
  }
});
