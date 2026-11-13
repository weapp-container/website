export const locales = ['zh-CN', 'en'];
export const defaultLocale = 'zh-CN';
export const localeFromPath = path => path === '/en' || path.startsWith('/en/') ? 'en' : 'zh-CN';
export const unlocalizedPath = path => path === '/en/' || path === '/en' ? '/' : path.replace(/^\/en(?=\/)/, '');
export function localizedPath(path, locale) {
  const base = unlocalizedPath(path);
  return locale === 'en' ? `/en${base}` : base;
}
export const messages = {
  'zh-CN': {
    siteTitle: 'Weapp Container · 小程序，运行在更多地方',
    siteDescription: 'Weapp Container 中文文档、平台接入、API 参考与在线演示。',
    skip: '跳至内容', home: '首页', docs: '开发文档', demo: '在线体验', platforms: '全端进展', guide: '开始接入',
    mainNav: '主导航', mobileNav: '移动导航', menu: '打开或关闭导航菜单', theme: '切换深浅主题',
    tagline: '同一份小程序，更多运行场景。', license: '许可说明', source: '站点源码',
    docsNav: '文档导航', search: '搜索文档与 API', searchResults: '搜索结果', empty: '没有匹配的文档',
    searchError: '搜索索引暂时无法加载，请重试。', searchLoading: '正在加载搜索索引…',
    apiGroups: '小程序 API 分组', defaults: '默认能力清单', toc: '本页目录', troubleshooting: '问题排查',
    contract: '共享 SDK 协议', copy: '复制', copied: '已复制', copyError: '复制失败',
    engineering: '进阶工程文档', sourcePage: '查看版本化源文件', sourceRevision: '来源提交',
    demoChinese: '示例小程序内部使用中文，支付与订单均为模拟数据。',
  },
  en: {
    siteTitle: 'Weapp Container · Mini-programs across hosts',
    siteDescription: 'Weapp Container documentation, platform integrations, API references, and live demonstrations.',
    skip: 'Skip to content', home: 'Home', docs: 'Documentation', demo: 'Live demo', platforms: 'Platform status', guide: 'Get started',
    mainNav: 'Main navigation', mobileNav: 'Mobile navigation', menu: 'Open or close navigation', theme: 'Toggle color theme',
    tagline: 'One mini-program, more places to run.', license: 'Licensing', source: 'Website source',
    docsNav: 'Documentation navigation', search: 'Search documentation and APIs', searchResults: 'Search results', empty: 'No matching documents',
    searchError: 'The search index could not be loaded. Please try again.', searchLoading: 'Loading search index…',
    apiGroups: 'Mini-program API groups', defaults: 'Default capabilities', toc: 'On this page', troubleshooting: 'Troubleshooting',
    contract: 'Shared SDK contracts', copy: 'Copy', copied: 'Copied', copyError: 'Copy failed',
    engineering: 'Engineering reference', sourcePage: 'View versioned source', sourceRevision: 'Source revision',
    demoChinese: 'The sample mini-program is in Chinese. Payments and orders are simulated.',
  },
};
export const ui = locale => messages[locale] || messages[defaultLocale];
