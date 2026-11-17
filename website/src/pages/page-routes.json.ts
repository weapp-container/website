import type {APIRoute} from 'astro';
import {contentPages} from '../data/content-pages';
import {createRouteMap} from '../data/route-map.mjs';
import inventory from '../data/api-inventory-v1.json';
import {apiSlug} from '../data/api-group-meta.mjs';

export const GET: APIRoute = async () => {
  const pages = (await contentPages()).map(page => page.data);
  const staticPages = ['/', '/guide/', '/platforms/', '/demo/'];
  const apiPages = inventory.apis.map(api => `/docs/api/${apiSlug(api.id)}/`);
  for (const route of [...staticPages, ...apiPages]) for (const locale of ['zh-CN', 'en']) pages.push({id: route, route, locale} as typeof pages[number]);
  return Response.json(createRouteMap(pages));
};
