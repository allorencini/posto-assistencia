import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Posto Assistência',
        short_name: 'Posto',
        description: 'Posto de Assistência — controle de presença, cestas e doações',
        theme_color: '#0f3460',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Páginas admin raramente são abertas — não precisam ocupar precache.
        // Continuam funcionando online via runtime cache (StaleWhileRevalidate).
        globIgnores: [
          '**/assets/users-page-*.js',
          '**/assets/audit-page-*.js',
          '**/assets/lgpd-page-*.js',
          '**/assets/termos-page-*.js',
          '**/assets/resync-page-*.js',
          '**/assets/admin-*.js',
          '**/assets/privacidade-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/assets\/(?:users-page|audit-page|lgpd-page|termos-page|resync-page|admin|privacidade)-.*\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lazy-pages',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'query-vendor': ['@tanstack/react-query'],
          'dexie-vendor': ['dexie'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            'lucide-react',
            'sonner',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
