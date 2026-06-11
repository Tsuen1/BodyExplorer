import { defineConfig } from 'vite';

const base = process.env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : '/BodyExplorer/');

export default defineConfig({
  base,
  server: {
    port: 4000,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
