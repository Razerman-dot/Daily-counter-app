import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API is proxied through Vite, so the browser sees a single
// origin (localhost:5173) and the auth cookie is first-party.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
