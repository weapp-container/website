import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import {frontendNoticesPlugin} from './tools/frontend-notices.mjs';

export default defineConfig({
  site: 'https://container.weapp.dev',
  srcDir: './website/src',
  publicDir: './website/public',
  outDir: './dist',
  integrations: [react()],
  trailingSlash: 'always',
  vite: {
    plugins: [frontendNoticesPlugin()],
    build: { sourcemap: false },
    server: { watch: { ignored: ['**/.private/**','**/artifacts/**','**/.runtime/**','**/hosts/**'] } },
  },
});
