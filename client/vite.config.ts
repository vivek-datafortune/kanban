import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    // Tell the browser to connect HMR WebSocket to localhost (not the container IP)
    hmr: {
      host: 'localhost',
      port: 5173,
    },
    // Windows bind mounts don't emit inotify events into Linux containers — use polling
    watch: {
      usePolling: true,
      interval: 500,
    },
    proxy: {
      // forward /api/* and /admin/* to Django
      '/api': {
        target: 'http://web:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://web:8000',
        changeOrigin: true,
      },
      // forward WebSocket connections to Django/Daphne
      '/ws': {
        target: 'http://web:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
