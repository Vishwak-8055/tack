import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Same-origin in development too, so the session cookie and the event stream just work.
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Libraries change far less often than app code, so give them their own cacheable files.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id)) return 'react';
          if (
            /node_modules\/(@hello-pangea|react-redux|redux|raf-schd|css-box-model|memoize-one)/.test(
              id,
            )
          ) {
            return 'dnd';
          }
          if (/node_modules\/(@tanstack|zod)\//.test(id)) return 'data';
        },
      },
      onwarn(warning, warn) {
        // zod ships comments Rollup can't interpret. Harmless, and not ours to fix.
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) return;
        warn(warning);
      },
    },
  },
});
