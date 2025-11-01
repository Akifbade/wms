import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      '/api': {
        // Use backend container name in Docker, localhost for local development
        target: process.env.DOCKER_ENV === 'true' ? 'http://backend:5000' : 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Manual chunks for better caching and faster loads
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // UI libraries
            if (id.includes('@heroicons')) {
              return 'ui-vendor';
            }
            // Charts
            if (id.includes('recharts') || id.includes('victory')) {
              return 'chart-vendor';
            }
            // PDF/Canvas
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
              return 'pdf-vendor';
            }
            // QR code
            if (id.includes('qrcode') || id.includes('html5-qrcode')) {
              return 'qr-vendor';
            }
            // Everything else from node_modules
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
});