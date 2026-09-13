import { defineConfig } from 'vite';

export default defineConfig({
  ssr: { noExternal: true },
  build: {
    emptyOutDir: false,
    ssr: 'src/worker.ts',
    outDir: 'dist/server',
    rollupOptions: { output: { entryFileNames: 'index.js' } },
  },
});
