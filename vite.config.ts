import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
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
