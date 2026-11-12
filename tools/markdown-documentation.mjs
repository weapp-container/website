import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Repository language links are relative Markdown paths; published links use
// the catalog's stable page routes, including the target language prefix.
export function documentationLinks({catalog = JSON.parse(readFileSync(resolve(root, 'documentation.json'), 'utf8'))} = {}) {
  const pages = catalog.pages.filter(page => page.route);
  const routes = new Map(pages.flatMap(page => [[resolve(root, page.zh), page.route], [resolve(root, page.en), `/en${page.route}`]]));
  return (tree, file) => {
    const metadata = file.data?.astro?.frontmatter;
    const page = pages.find(page => page.route === metadata?.route);
    const source = file.path || (page && resolve(root, metadata?.locale === 'en' ? page.en : page.zh));
    if (!source) return;
    const visit = node => {
      if (typeof node.url === 'string' && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(node.url)) {
        const [path, fragment] = node.url.split('#', 2);
        const route = routes.get(resolve(dirname(source), decodeURIComponent(path)));
        if (route) node.url = route + (fragment ? `#${fragment}` : '');
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

// Apply the same code-block interaction to native Markdown and Astro guides.
export function documentationCodeBlocks() {
  return tree => {
    const visit = node => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map(child => {
        if (child.type !== 'element' || child.tagName !== 'pre') { visit(child); return child; }
        const code = child.children?.find(item => item.type === 'element' && item.tagName === 'code');
        const language = code?.properties?.className?.find?.(name => name.startsWith('language-'))?.slice(9) || child.properties?.dataLanguage || 'text';
        const element = (tagName, properties, children) => ({type: 'element', tagName, properties, children});
        return element('div', {className: ['docs-code-block'], dataCodeLanguage: language}, [
          element('div', {className: ['docs-code-toolbar']}, [
            element('span', {}, [{type: 'text', value: language}]),
            element('button', {type: 'button', className: ['docs-copy-button'], dataCopyCode: true}, [{type: 'text', value: 'Copy'}]),
          ]), child,
        ]);
      });
    };
    visit(tree);
  };
}
