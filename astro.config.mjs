import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://swe-squad.dev',
  srcDir: './src',
  publicDir: './public',
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
});
