import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project at https://bassyj32-ui.github.io/BackGuard/,
// so every asset URL needs the subpath prefix. Vite rewrites index.html
// references automatically; runtime strings in src must use import.meta.env.BASE_URL.
export default defineConfig({
  base: '/BackGuard/',
  plugins: [react()],
  build: {
    target: 'es2022',
  },
  worker: {
    // The pose worker code-splits the MediaPipe runtime behind a dynamic
    // import, which rules out the default iife output format.
    format: 'es',
  },
  server: {
    // Required so the camera can be reached from a phone on the same wifi
    // during development. getUserMedia needs a secure context, and http://<lan-ip>
    // is not one, so use a tunnel or the built-in preview server over https.
    host: true,
  },
});