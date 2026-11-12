import type { APIRoute } from 'astro';
import inventory from '../data/api-inventory-v1.json';
import { apiSlug } from '../data/api-group-meta.mjs';
import { docsPages } from '../data/docs-pages.mjs';

const routes = [
  '/',
  '/demo/',
  '/platforms/',
  '/guide/',
  ...docsPages.map((page) => page.path),
  ...inventory.apis.map((api) => `/docs/api/${apiSlug(api.id)}/`),
];

export const GET: APIRoute = ({ site }) => {
  const entries = [...new Set(routes)].map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
