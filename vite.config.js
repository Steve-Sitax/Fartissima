import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1000 },
  server: { port: 5178, host: '127.0.0.1' },
});
