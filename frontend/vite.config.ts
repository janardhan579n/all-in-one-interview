/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to the Spring Boot backend so the browser sees a single
// origin. In production nginx does the same job (see docker-compose.yml).
//
// VITE_DISABLE_API_PROXY=1 turns that proxy off. The E2E suite's "offline mode" test needs
// this: with the proxy on, hitting `/api/health` with no backend running fails the proxy's own
// upstream connection (a hard error, logged to the console) instead of reaching this server's
// SPA fallback the way an actual static deploy (Netlify, `public/_redirects`) does — where an
// unmatched path just gets `index.html` back with a 200, silently. The flag makes local preview
// match that deployed shape instead of the dev-time proxy shape.
const disableApiProxy = process.env.VITE_DISABLE_API_PROXY === '1';

export default defineConfig({
  plugins: [react()],
  // "/" for a normal deploy. Set VITE_BASE=/repo-name/ when publishing under a sub-path, as
  // GitHub Pages does; main.tsx feeds the same value to the router as its basename.
  base: process.env.VITE_BASE ?? '/',
  server: {
    port: 5173,
    host: true,
    proxy: disableApiProxy
      ? undefined
      : {
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
    proxy: disableApiProxy
      ? undefined
      : {
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
