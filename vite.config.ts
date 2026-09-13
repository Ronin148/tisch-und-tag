import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE_PATH || '/',
    build: { outDir: 'dist/client' },
    plugins: [react(), VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'images/*'],
      manifest: {
        name: 'Tisch & Tag – Dein Kochbuch', short_name: 'Tisch & Tag',
        description: 'Rezepte sammeln, die Woche planen und einfach einkaufen.',
        theme_color: '#245744', background_color: '#f7f7f2', display: 'standalone',
        lang: 'de', start_url: '.',
        icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'], globIgnores: ['ocr/**'], maximumFileSizeToCacheInBytes: 3_000_000,
        runtimeCaching: [{ urlPattern: /\/ocr\//, handler: 'CacheFirst', options: { cacheName: 'tisch-ocr-v1', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } } }],
      },
    })],
  };
});
