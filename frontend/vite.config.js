import { defineConfig } from 'vite';

// Allow overriding backend port via environment variable BACKEND_PORT or PORT.
const backendPort = process.env.BACKEND_PORT || process.env.PORT || 4000;

export default defineConfig({
  root: 'frontend',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
