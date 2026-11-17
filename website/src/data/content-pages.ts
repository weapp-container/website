import {getCollection} from 'astro:content';
import {localizedPath} from './i18n.mjs';

export async function contentPages() {
  const [guides, engineering] = await Promise.all([getCollection('guides'), getCollection('engineering')]);
  return [...guides, ...engineering].map(entry => ({...entry, path: localizedPath(entry.data.route, entry.data.locale), kind: entry.collection}));
}
