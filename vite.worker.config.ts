import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    ssr: 'src/worker.ts',
    outDir: 'dist/server',
    rollupOptions: { output: { entryFileNames: 'index.js' } },
  },
});
