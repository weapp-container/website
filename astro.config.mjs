import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import {frontendNoticesPlugin} from './tools/frontend-notices.mjs';
import {documentationCodeBlocks, documentationLinks} from './tools/markdown-documentation.mjs';
import {unified} from '@astrojs/markdown-remark';

export default defineConfig({
  site: 'https://container.weapp.dev',
  srcDir: './website/src',
  publicDir: './website/public',
  outDir: './dist',
  integrations: [react()],
  trailingSlash: 'always',
  markdown: {
    shikiConfig: {themes: {light: 'github-light', dark: 'github-dark'}, defaultColor: false},
    processor: unified({remarkPlugins: [documentationLinks], rehypePlugins: [documentationCodeBlocks]}),
  },
  vite: {
    plugins: [frontendNoticesPlugin()],
    build: { sourcemap: false },
    server: { watch: { ignored: ['**/.private/**','**/artifacts/**','**/.runtime/**','**/hosts/**'] } },
  },
});
