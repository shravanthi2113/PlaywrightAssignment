import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api to the gateway so the browser sees a single origin (no CORS needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': process.env.GATEWAY_URL || 'http://localhost:8080' },
  },
});
