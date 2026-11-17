import {localizedPath} from './i18n.mjs';

// A page identity is independent of its translated title and URL prefix.
export function createRouteMap(pages) {
  const ids = new Map(), paths = new Set();
  for (const page of pages) {
    const path = localizedPath(page.route, page.locale);
    if (paths.has(path)) throw new Error(`Duplicate page route: ${path}`);
    paths.add(path);
    const pair = ids.get(page.id) || {};
    if (pair[page.locale]) throw new Error(`Duplicate page locale: ${page.id}`);
    pair[page.locale] = path; ids.set(page.id, pair);
  }
  for (const [id, pair] of ids) if (!pair['zh-CN'] || !pair.en) throw new Error(`Missing translated route: ${id}`);
  return [...ids].map(([id, routes]) => ({id, routes}));
}
