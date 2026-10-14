import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import iconSubset from './scripts/iconSubset.mjs';

// API and uploaded images are proxied so the app, cookies and images share one origin in dev.
export default defineConfig({
  plugins: [react(), iconSubset()],
  server: {
    port: 3000,
    strictPort: true,
    host: true, // also reachable from phones on the same Wi-Fi via http://<your-PC-IP>:3000
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
      '/sitemap.xml': { target: 'http://localhost:5000', changeOrigin: true },
      '/robots.txt': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
