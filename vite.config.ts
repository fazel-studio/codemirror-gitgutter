import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: 'examples/basic',
  resolve: {
    alias: {
      // Allow the playground to import the package by its public name while
      // consuming the source directly (no build step needed for `npm run dev`).
      '@fazelstudio/codemirror-gitgutter': fileURLToPath(
        new URL('./src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
  },
});
