import {contentPages} from './content-pages';
import inventory from './api-inventory-v1.json';
import capabilities from './api-default-capabilities-v1.json';
import translations from './api-translations.json';
import {apiGroupMeta, apiSlug} from './api-group-meta.mjs';
import {localizedPath} from './i18n.mjs';

export async function searchIndex(locale: 'zh-CN' | 'en') {
  const en = locale === 'en';
  const pages = (await contentPages()).filter(page => page.data.locale === locale);
  return [
    ...pages.map(page => ({path: page.path, title: page.data.title, summary: page.data.summary, keywords: page.data.section, body: page.body || ''})),
    ...inventory.apis.map(api => ({
      path: localizedPath(`/docs/api/${apiSlug(api.id)}/`, locale),
      title: en ? translations.en[api.id as keyof typeof translations.en].title : apiGroupMeta[api.id as keyof typeof apiGroupMeta]?.title || api.id,
      summary: en ? api.difference : translations['zh-CN'][api.id as keyof typeof translations['zh-CN']].difference,
      keywords: `${api.id} ${api.names.join(' ')} ${Object.keys(api.hostCoverage || {}).join(' ')}`,
      body: '',
    })),
    // APIs with coverage belong to their reference group. Only capability-only
    // entries need a separate result pointing to the defaults table.
    ...Object.keys(capabilities).filter(name => !inventory.apis.some(api => api.names.includes(name))).map(name => ({
      path: localizedPath('/docs/api/capability-defaults/', locale), title: name,
      summary: en ? 'Runtime manifest default. Independent platform records are listed in the API inventory.' : '运行时 manifest 默认能力，逐平台覆盖状态以 API 清单为准。',
      keywords: `${en ? 'Default capability' : '能力默认值'} ${name}`, body: '',
    })),
  ];
}
