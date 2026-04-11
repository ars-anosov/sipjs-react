import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: './', // делает ссылки относительными
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // rollupOptions: {
    //   output: {
    //     manualChunks(id) {
    //       if (id.includes('node_modules')) {
    //         if (id.includes('react') || id.includes('redux')) {
    //           return 'vendor';
    //         }
    //         if (id.includes('@mui') || id.includes('@emotion')) {
    //           return 'mui';
    //         }
    //         if (id.includes('sip.js')) {
    //           return 'sip';
    //         }
    //         if (id.includes('date-fns') || id.includes('redux-logger') || id.includes('redux-thunk')) {
    //           return 'utils';
    //         }
    //       }
    //     }
    //   }
    // },
    chunkSizeWarningLimit: 1000 // Increase warning limit since we're splitting
  },
  server: {
    port: 3000,
    watch: {
      usePolling: true, // Включает опрос для отслеживания изменений в контейнерах/WSL
    },
  },
  plugins: [react()],
});
