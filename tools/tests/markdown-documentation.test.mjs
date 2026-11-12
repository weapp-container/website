import test from 'node:test';
import assert from 'node:assert/strict';
import {documentationLinks} from '../markdown-documentation.mjs';

test('repository guide links become same-page translated routes without changing code or external links', () => {
  const catalog = {pages: [{zh: 'website/src/content/guides/start.md', en: 'website/src/content/guides/start.en.md', route: '/docs/start/'}]};
  const tree = {children: [{type: 'link', url: 'start.en.md#prepare-source'}, {type: 'link', url: 'https://example.com/file.md'}, {type: 'inlineCode', value: 'start.en.md'}]};
  documentationLinks({catalog})(tree, {data: {astro: {frontmatter: {route: '/docs/start/', locale: 'zh-CN'}}}});
  assert.equal(tree.children[0].url, '/en/docs/start/#prepare-source');
  assert.equal(tree.children[1].url, 'https://example.com/file.md');
  assert.equal(tree.children[2].value, 'start.en.md');
});
