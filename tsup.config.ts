import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: true,
  target: 'es2020',
  external: ['@codemirror/state', '@codemirror/view', '@codemirror/language'],
  noExternal: ['diff'],
});
