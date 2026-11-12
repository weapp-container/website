import type { APIRoute } from 'astro';
import inventory from '../../data/api-inventory-v1.json';
import capabilities from '../../data/api-default-capabilities-v1.json';
import { apiGroupMeta, apiSlug } from '../../data/api-group-meta.mjs';
import { docsPages } from '../../data/docs-pages.mjs';

const index = [
  ...docsPages.map((page) => ({ path: page.path, title: page.title, summary: page.summary, keywords: page.section })),
  ...inventory.apis.map((api) => ({
    path: `/docs/api/${apiSlug(api.id)}/`,
    title: apiGroupMeta[api.id as keyof typeof apiGroupMeta]?.title || api.id,
    summary: api.difference,
    keywords: `${api.id} ${api.names.join(' ')} ${Object.keys(api.hostCoverage || {}).join(' ')}`,
  })),
  ...Object.keys(capabilities).map((name) => ({
    path: '/docs/api/capability-defaults/',
    title: name,
    summary: '运行时 manifest 默认能力，逐平台覆盖状态请以 API 清单为准。',
    keywords: `能力默认值 ${name}`,
  })),
];

export const GET: APIRoute = () => new Response(JSON.stringify(index), {
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
});
