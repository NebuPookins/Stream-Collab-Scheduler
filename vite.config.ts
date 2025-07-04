/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Stream-Collab-Scheduler/',
  test: {
    globals: true,
    environment: 'jsdom',
  },
  plugins: [react()],
  server: {
    port: 3000
  },
  root: '.',            // ensure Vite finds index.html at project root
  publicDir: 'public',  // serve static assets from ./public
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});