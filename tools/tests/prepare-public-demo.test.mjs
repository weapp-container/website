import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preparePublicDemo } from '../prepare-public-demo.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value));
const pin = bytes => ({ size: bytes.length, sha256: sha(bytes) });
async function fixture(t, filePath = 'licenses/example+spec/LICENSE') {
  const root = await mkdtemp(join(tmpdir(), 'public-demo-')); t.after(() => rm(root, { recursive: true, force: true }));
  const deploymentHash = 'a'.repeat(64), bytes = Buffer.from('reviewed public demo');
  const config = { deploymentHash, entry: `/runtime/${deploymentHash}/index.html`, distributionProfile: 'restricted-showcase', packRoot: 'b'.repeat(64), policySha256: 'c'.repeat(64) };
  const inventory = { packRoot: config.packRoot, policySha256: config.policySha256, files: [{ path: filePath, ...pin(bytes) }] };
  const configBytes = json(config), inventoryBytes = json(inventory), origin = 'https://container.weapp.dev';
  const lockPath = join(root, 'lock.json'); await writeFile(lockPath, json({ schemaVersion: 1, origin, config: pin(configBytes), inventory: pin(inventoryBytes) }));
  await mkdir(join(root, 'public-demo'));
  await writeFile(join(root, 'public-demo/showcase-runtime.json'), configBytes);
  await writeFile(join(root, 'public-demo/deployment-inventory.json'), inventoryBytes);
  const assetPath = filePath === 'index.html' ? '' : filePath.endsWith('.html') ? filePath.slice(0, -5) : filePath;
  const responses = new Map([[origin + `/runtime/${deploymentHash}/${assetPath.split('/').map(encodeURIComponent).join('/')}`, bytes]]);
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push(url); assert.equal(options.redirect, 'error'); assert.equal(options.headers, undefined); assert.ok(responses.has(url)); return new Response(responses.get(url)); };
  return { root, lockPath, deploymentHash, bytes, responses, calls, fetchImpl, publicDirectory: join(root, 'public') };
}
test('public builds reproduce the pinned demo without a GitHub token and reuse verified files', async t => {
  const f = await fixture(t);
  const first = await preparePublicDemo(f); assert.equal(first.status, 'verified-public-demo'); assert.equal(f.calls.length, 1);
  assert.ok(f.calls[0].includes('example%2Bspec'));
  assert.deepEqual(await readFile(join(f.publicDirectory, 'runtime', f.deploymentHash, 'licenses/example+spec/LICENSE')), f.bytes);
  await preparePublicDemo({ ...f, fetchImpl() { assert.fail('Verified cache must work offline'); } });
});
test('a changed asset cannot publish a partial directory', async t => {
  const f = await fixture(t); f.responses.set([...f.responses.keys()].at(-1), Buffer.from('altered data'));
  await assert.rejects(preparePublicDemo(f), /differs/);
  assert.deepEqual(await readdir(join(f.publicDirectory, 'runtime')), []);
});
test('a pinned inventory still cannot escape the public runtime root', async t => {
  const f = await fixture(t, '../outside');
  await assert.rejects(preparePublicDemo(f), /Unsafe public demo path/);
  assert.equal(f.calls.length, 0);
});
test('damaged cached assets fail without fetching replacements', async t => {
  const f = await fixture(t); await preparePublicDemo(f);
  await rm(join(f.publicDirectory, 'runtime', f.deploymentHash, 'licenses'), { recursive: true });
  await assert.rejects(preparePublicDemo({ ...f, fetchImpl() { assert.fail('Corrupt cache must fail closed'); } }), /unreviewed files/);
});
test('changed versioned metadata is rejected before network access', async t => {
  const f = await fixture(t); await writeFile(join(f.root, 'public-demo/showcase-runtime.json'), '{}');
  await assert.rejects(preparePublicDemo(f), /snapshot differs/); assert.equal(f.calls.length, 0);
});
test('HTML uses its canonical same-origin route without following redirects', async t => {
  const f = await fixture(t, 'index.html'); await preparePublicDemo(f);
  assert.deepEqual(f.calls, [`https://container.weapp.dev/runtime/${f.deploymentHash}/`]);
});
