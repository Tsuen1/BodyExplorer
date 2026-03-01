import { defineConfig } from 'vite';

export default defineConfig({
  base: '/BodyExplorer/',
  server: {
    port: 4000,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
