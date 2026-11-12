import test from 'node:test';
import assert from 'node:assert/strict';
import {localizedPath, localeFromPath, unlocalizedPath} from '../../website/src/data/i18n.mjs';
import {createRouteMap} from '../../website/src/data/route-map.mjs';

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
