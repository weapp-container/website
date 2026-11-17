import type { APIRoute } from 'astro';
import inventory from '../data/api-inventory-v1.json';
import { apiSlug } from '../data/api-group-meta.mjs';
import { docsPages } from '../data/docs-pages.mjs';
import {contentPages} from '../data/content-pages';

const routes = [
  '/',
  '/demo/',
  '/platforms/',
  '/guide/',
  ...docsPages.map((page) => page.path),
  ...inventory.apis.map((api) => `/docs/api/${apiSlug(api.id)}/`),
];

export const GET: APIRoute = async ({ site }) => {
  const content = await contentPages();
  const all = [...new Set([...routes, ...content.filter(page => page.data.locale === 'zh-CN').map(page => page.path)])];
  const entries = all.flatMap(path => [path, `/en${path}`]).map(path => {
    const chinese = path.replace(/^\/en(?=\/)/, '');
    return `  <url><loc>${new URL(path, site).href}</loc><xhtml:link rel="alternate" hreflang="zh-CN" href="${new URL(chinese, site).href}"/><xhtml:link rel="alternate" hreflang="en" href="${new URL(`/en${chinese}`, site).href}"/><xhtml:link rel="alternate" hreflang="x-default" href="${new URL(chinese, site).href}"/></url>`;
  }).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
