import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://swe-squad.dev',
  srcDir: './src',
  publicDir: './public',
  integrations: [mdx()],
});
