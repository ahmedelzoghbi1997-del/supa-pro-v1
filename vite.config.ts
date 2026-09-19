import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg', 'icon-192x192.png', 'icon-512x512.png', 'badge-icon.png'],
          manifest: {
            id: '/',
            name: 'المحاسب الزراعي',
            short_name: 'المحاسب',
            description: 'تطبيق المحاسب الزراعي والأجندة الزراعية الذكية لمتابعة مواسم الزراعة والخزنة والديون والمبيعات والمصروفات.',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait-primary',
            dir: 'rtl',
            lang: 'ar',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/badge-icon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'monochrome',
              },
              {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            cleanupOutdatedCaches: true,
            importScripts: ['/service-worker.js'],
          },
          devOptions: {
            enabled: true,
            type: 'module',
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2020',
        cssCodeSplit: true,
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'supabase-vendor': ['@supabase/supabase-js'],
              'db-vendor': ['dexie'],
            }
          }
        }
      }
    };
});
