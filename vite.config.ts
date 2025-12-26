import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3005,
    strictPort: true,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    }
  },
  build: {
    // تحسين حجم الملفات
    chunkSizeWarningLimit: 1000, // زيادة الحد للتحذير (اختياري)
    rollupOptions: {
      output: {
        // تقسيم الكود إلى chunks أصغر
        manualChunks: (id) => {
          // فصل node_modules
          if (id.includes('node_modules')) {
            // React و React-DOM
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Framer Motion
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Google AI
            if (id.includes('@google/generative-ai')) {
              return 'google-ai';
            }
            // Lucide Icons
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            // باقي node_modules
            return 'vendor';
          }
        },
        // تحسين أسماء الملفات
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // تحسين الأداء - استخدام esbuild (أسرع وأخف)
    minify: 'esbuild',
    // تحسين حجم الملفات
    target: 'es2015',
    cssCodeSplit: true,
  },
});
