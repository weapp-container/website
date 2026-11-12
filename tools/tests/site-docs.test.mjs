import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiGroupMeta } from '../../website/src/data/api-group-meta.mjs';
import { docsPages } from '../../website/src/data/docs-pages.mjs';
import { verifyApiDocsData } from '../verify-api-docs.mjs';
import { LEGACY_SHOWCASE_REPOSITORY, WEBSITE_REPOSITORY } from '../sdk-install.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

test('API snapshot hashes, source revision, defaults and documented coverage gaps are current', async () => {
  const result = await verifyApiDocsData();
  assert.deepEqual(result, {
    groups: 29,
    inventoryNames: 135,
    capabilities: 115,
    capabilityOnly: 12,
    sourceCommit: '6b2e8074c9eade41b526cb556fe4542d9b3a1aa5',
  });
});

test('every API group has metadata and presents names, limitations and conformance evidence', async () => {
  const inventory = JSON.parse(await readFile(resolve(root, 'website/src/data/api-inventory-v1.json'), 'utf8'));
  const page = await readFile(resolve(root, 'website/src/components/ApiGroupPage.astro'), 'utf8');
  for (const api of inventory.apis) {
    assert.ok(apiGroupMeta[api.id], `Missing title and section for ${api.id}`);
    assert.ok(api.names.length > 0 && api.difference.length > 0 && api.conformance.length > 0, `Missing evidence or limitation for ${api.id}`);
  }
  assert.match(page, /包含的名称/);
  assert.match(page, /实现差异与限制/);
  assert.match(page, /宿主覆盖/);
  assert.match(page, /核验案例/);
  assert.match(page, /api-runtime-conformance/);
});

test('all documentation navigation pages resolve to source pages and carry searchable summaries', async () => {
  const seen = new Set();
  for (const page of docsPages) {
    assert.ok(!seen.has(page.path), `Duplicate documentation route: ${page.path}`);
    seen.add(page.path);
    assert.ok(page.title && page.section && page.summary, `Incomplete search metadata: ${page.path}`);
    const relative = page.path.replace(/^\/docs\//, '').replace(/\/$/, '');
    const direct = resolve(root, 'website/src/content/guides', `${relative || 'index'}.md`);
    await assert.doesNotReject(access(direct));
    assert.match(await readFile(direct, 'utf8'), new RegExp(`route: "${page.path}"`));
  }
});

test('current artifact locks target website while historical pins keep their legacy repository', async () => {
  for (const file of ['platforms/sdk-artifacts.lock.json', 'platforms/miniapp-artifact.lock.json', 'platforms/web-runtime.pin.json']) {
    const lock = JSON.parse(await readFile(resolve(root, file), 'utf8'));
    assert.equal(lock.repository, WEBSITE_REPOSITORY, `${file} must target new releases`);
  }
  const history = JSON.parse(await readFile(resolve(root, 'platforms/miniapp-history/03ebf262fee087367eda3ba4b5c326035d952db73253fa321e4dd8892a29ea88.lock.json'), 'utf8'));
  assert.equal(history.repository, LEGACY_SHOWCASE_REPOSITORY);
  assert.equal(history.releaseTag, 'showcase-v0.1.0-preview.6.0-candidate3');
});
