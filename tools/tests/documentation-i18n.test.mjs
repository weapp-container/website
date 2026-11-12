import test from 'node:test';
import assert from 'node:assert/strict';
import {localizedPath, localeFromPath, unlocalizedPath} from '../../website/src/data/i18n.mjs';
import {createRouteMap} from '../../website/src/data/route-map.mjs';
import {readFile} from 'node:fs/promises';

test('locale routing preserves Chinese URLs and query/device state', () => {
  assert.equal(localeFromPath('/docs/start/'), 'zh-CN');
  assert.equal(localeFromPath('/en/docs/start/'), 'en');
  assert.equal(localizedPath('/docs/start/#prepare-source', 'en'), '/en/docs/start/#prepare-source');
  assert.equal(localizedPath('/en/demo/?device=iphone-duo&display=inner&rotation=90', 'zh-CN'), '/demo/?device=iphone-duo&display=inner&rotation=90');
  assert.equal(unlocalizedPath('/en/'), '/');
});
test('route identities reject missing translations and duplicate destinations', () => {
  const zh = {id: 'start', route: '/docs/start/', locale: 'zh-CN'};
  assert.throws(() => createRouteMap([zh]), /Missing translated route/);
  const en = {...zh, locale: 'en'};
  assert.deepEqual(createRouteMap([zh, en]), [{id: 'start', routes: {'zh-CN': '/docs/start/', en: '/en/docs/start/'}}]);
  assert.throws(() => createRouteMap([zh, en, {...zh, id: 'other'}]), /Duplicate page route/);
});

test('authored guide metadata preserves page identities and explicit language', async () => {
  const root = new URL('../../', import.meta.url);
  const catalog = JSON.parse(await readFile(new URL('documentation.json', root), 'utf8'));
  const pages = [];
  for (const page of catalog.pages.filter(page => page.route)) {
    const pair = [];
    for (const [locale, path] of [['zh-CN', page.zh], ['en', page.en]]) {
      const text = await readFile(new URL(path, root), 'utf8');
      const header = text.match(/^---\n([\s\S]*?)\n---\n/);
      assert.ok(header, `Missing frontmatter: ${path}`);
      const data = Object.fromEntries(header[1].split('\n').map(line => {
        const field = line.match(/^([a-zA-Z]+): (.+)$/);
        assert.ok(field, `Malformed metadata: ${path}: ${line}`);
        return [field[1], JSON.parse(field[2])];
      }));
      assert.deepEqual(Object.keys(data).sort(), ['id', 'locale', 'route', 'section', 'summary', 'title']);
      assert.equal(data.locale, locale, path);
      assert.equal(data.route, page.route, path);
      assert.equal(data.route, `/docs/${data.id === 'index' ? '' : `${data.id}/`}`, `Translated page identity: ${path}`);
      pair.push(data); pages.push(data);
    }
    assert.equal(pair[0].id, pair[1].id);
  }
  assert.equal(createRouteMap(pages).length, catalog.pages.filter(page => page.route).length);
});
