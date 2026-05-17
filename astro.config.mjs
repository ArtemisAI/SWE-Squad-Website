import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://swe-squad.dev',
  srcDir: './src',
  publicDir: './public',
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { inlineStylesheets: 'auto' },
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
});
