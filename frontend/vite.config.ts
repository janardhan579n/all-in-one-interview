/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to the Spring Boot backend so the browser sees a single
// origin. In production nginx does the same job (see docker-compose.yml).
export default defineConfig({
  plugins: [react()],
  // "/" for a normal deploy. Set VITE_BASE=/repo-name/ when publishing under a sub-path, as
  // GitHub Pages does; main.tsx feeds the same value to the router as its basename.
  base: process.env.VITE_BASE ?? '/',
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  // `npm run preview` serves the production build. It needs the same proxy as the dev server,
  // or a local production check silently runs in offline mode and you never exercise the API.
  preview: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Route-level code splitting keeps the initial payload small; this manual chunk
    // stops the shared vendor code being duplicated into every lazy route.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
