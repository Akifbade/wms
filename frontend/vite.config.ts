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
        // Disable manual chunks to prevent React dependency issues
        // All code will be bundled together ensuring proper load order
        manualChunks: undefined,
      },
    },
    // Increase chunk size warning limit since we're bundling more together
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});