import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, dirname} from 'node:path';
import {documentRoute, hash, rewriteLinks, renderSnapshot, verifyDocumentationSnapshot} from '../documentation-snapshot.mjs';

test('routes preserve source identities and map both languages to one page', () => {
  assert.equal(documentRoute('weapp-container/sdk-ios', 'docs/window-metrics.en.md'), '/docs/engineering/sdk-ios/docs/window-metrics/');
  assert.equal(documentRoute('weapp-container/.github', 'profile/README.en.md'), '/docs/engineering/organization/profile/index/');
  assert.equal(documentRoute('weapp-container/weapp-container', '.github/PULL_REQUEST_TEMPLATE.md'), '/docs/engineering/weapp-container/github/pull_request_template/');
  assert.equal(documentRoute('weapp-container/website', 'tools/DOCUMENTATION.md'), '/docs/engineering/website/tools/documentation/');
  assert.equal(documentRoute('weapp-container/website', 'tools/documentation/README.en.md'), '/docs/engineering/website/tools/documentation/index/');
  const source = {repository: 'weapp-container/sdk-ios', commit: 'a'.repeat(40), path: 'docs/view.en.md'};
  const routes = new Map([['weapp-container/sdk-ios:README.en.md', '/en/docs/engineering/sdk-ios/index/']]);
  assert.equal(rewriteLinks('[Home](../README.en.md#lifecycle) [Code](../Sources/View.swift)', source, 'en', routes, new Map()), `[Home](/en/docs/engineering/sdk-ios/index/#lifecycle) [Code](https://github.com/weapp-container/sdk-ios/blob/${source.commit}/Sources/View.swift)`);
  assert.throws(() => rewriteLinks('[escape](../../outside.md)', source, 'en', routes, new Map()), /escapes repository/);
  const example = '```md\n[Home](../README.en.md)\n<img src="example.png" />\n```';
  assert.equal(rewriteLinks(example, source, 'en', routes, new Map()), example);
  assert.equal(rewriteLinks('[Home]: ../README.en.md', source, 'en', routes, new Map()), '[Home]: /en/docs/engineering/sdk-ios/index/');
  assert.equal(rewriteLinks('[Wrapped\nlabel](../README.en.md)', source, 'en', routes, new Map()), '[Wrapped\nlabel](/en/docs/engineering/sdk-ios/index/)');
  assert.equal(rewriteLinks('`[Example](../README.en.md)`', source, 'en', routes, new Map()), '`[Example](../README.en.md)`');
  assert.equal(rewriteLinks('[The `Session`\nreference](../README.en.md)', source, 'en', routes, new Map()), '[The `Session`\nreference](/en/docs/engineering/sdk-ios/index/)');
});

async function fixture(t) {
  const base = await mkdtemp(resolve(tmpdir(), 'container-snapshot-'));
  t.after(() => rm(base, {recursive: true, force: true}));
  const put = async (path, value) => {await mkdir(dirname(resolve(base, path)), {recursive: true}); await writeFile(resolve(base, path), value);};
  const commit = 'a'.repeat(40), repository = 'weapp-container/sdk-ios';
  const catalog = JSON.stringify({schemaVersion: 1, repository, pages: [{zh: 'README.md', en: 'README.en.md', section: 'SDK'}]}) + '\n', raw = '# Session\n\n[Code](Sources/Session.swift)\n';
  const page = {repository, commit, path: 'README.md', route: '/docs/engineering/sdk-ios/index/', section: 'SDK', locale: 'zh-CN', source: 'website/documentation-snapshots/sdk-ios/README.md', sourceSha256: hash(raw), output: 'website/src/content/engineering/sdk-ios/zh-CN/README.md'};
  const english = {...page, path: 'README.en.md', locale: 'en', source: 'website/documentation-snapshots/sdk-ios/README.en.md', output: 'website/src/content/engineering/sdk-ios/en/README.en.md'};
  const rendered = renderSnapshot({...page, raw}, new Map(), new Map());
  page.renderedSha256 = hash(rendered);
  const translated = renderSnapshot({...english, raw}, new Map(), new Map());
  english.renderedSha256 = hash(translated);
  const source = {repository, commit, catalog: 'website/documentation-snapshots/sdk-ios/documentation.json', catalogSha256: hash(catalog)};
  await put(source.catalog, catalog); await put(page.source, raw); await put(page.output, rendered);
  await put(english.source, raw); await put(english.output, translated);
  const manifest = {schemaVersion: 1, sources: [source], pages: [page, english], assets: []};
  await put('website/src/data/documentation-sources.json', JSON.stringify(manifest));
  return {base, put, page, source, manifest};
}
test('pinned raw source, derived rendering and exact file closure are verified', async t => {
  const f = await fixture(t);
  assert.deepEqual(await verifyDocumentationSnapshot(f.base), {pages: 2, sources: 1, assets: 0});
  await f.put(f.page.output, 'modified');
  await assert.rejects(verifyDocumentationSnapshot(f.base), /snapshot|source|Snapshot/);
});
test('omitted allowlisted language and unreferenced resources are rejected', async t => {
  const f = await fixture(t);
  const original = f.manifest.pages;
  f.manifest.pages = original.slice(0, 1);
  await f.put('website/src/data/documentation-sources.json', JSON.stringify(f.manifest));
  await assert.rejects(verifyDocumentationSnapshot(f.base), /allowlisted documentation page/);
  f.manifest.pages = original;
  f.manifest.assets.push({repository: f.page.repository, commit: f.page.commit, path: 'unexpected.svg'});
  await f.put('website/src/data/documentation-sources.json', JSON.stringify(f.manifest));
  await assert.rejects(verifyDocumentationSnapshot(f.base), /documentation resource/);
});
test('modified source catalogs and unlisted files are rejected', async t => {
  const f = await fixture(t);
  await f.put('website/src/content/engineering/unlisted.md', 'unreviewed');
  await assert.rejects(verifyDocumentationSnapshot(f.base), /Unreviewed/);
  await rm(resolve(f.base, 'website/src/content/engineering/unlisted.md'));
  await f.put(f.source.catalog, '{}');
  await assert.rejects(verifyDocumentationSnapshot(f.base), /catalog hash/);
});
test('engineering links to authored guides use their translated public routes', async t => {
  const f = await fixture(t);
  const repository = 'weapp-container/website', commit = 'b'.repeat(40);
  const catalog = JSON.stringify({repository, pages: [{zh: 'website/src/content/guides/start.md', en: 'website/src/content/guides/start.en.md', route: '/docs/start/'}]});
  const source = {repository, commit, catalog: 'website/documentation-snapshots/website/documentation.json', catalogSha256: hash(catalog)};
  await f.put(source.catalog, catalog);
  f.manifest.sources.push(source);
  const routes = new Map([
    ['weapp-container/website:website/src/content/guides/start.md', '/docs/start/'],
    ['weapp-container/website:website/src/content/guides/start.en.md', '/en/docs/start/'],
  ]);
  for (const page of f.manifest.pages) {
    const raw = '# Session\n\n[Quick start](https://github.com/weapp-container/website/blob/main/website/src/content/guides/start.md#prepare-source)\n';
    const rendered = renderSnapshot({...page, raw}, routes, new Map());
    assert.ok(rendered.includes(`](${page.locale === 'en' ? '/en' : ''}/docs/start/#prepare-source)`));
    page.sourceSha256 = hash(raw); page.renderedSha256 = hash(rendered);
    await f.put(page.source, raw); await f.put(page.output, rendered);
  }
  await f.put('website/src/data/documentation-sources.json', JSON.stringify(f.manifest));
  assert.deepEqual(await verifyDocumentationSnapshot(f.base), {pages: 2, sources: 2, assets: 0});
});
