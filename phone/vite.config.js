import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './mock/vite-mock-api.js';
 
// https://vite.dev/config/
export default defineConfig({
  base: './', // делает ссылки относительными
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000, // Increase warning limit since we're splitting
  },
  server: {
    port: 3000,
    watch: {
      usePolling: true, // Включает опрос для отслеживания изменений в контейнерах/WSL
    },
  },
  plugins: [react(), mockApiPlugin()],
});