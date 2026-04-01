import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: './', // делает ссылки относительными
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    watch: {
      usePolling: true, // Включает опрос для отслеживания изменений в контейнерах/WSL
    },
  },
  plugins: [react()],
});
