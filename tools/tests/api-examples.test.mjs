import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {excerpt, verifyApiExamples} from '../api-examples.mjs';

async function fixture(t) {
  const base = await mkdtemp(resolve(tmpdir(), 'container-api-examples-'));
  t.after(() => rm(base, {recursive: true, force: true}));
  const put = async (path, value) => {await mkdir(dirname(resolve(base, path)), {recursive: true}); await writeFile(resolve(base, path), value);};
  const raw = 'const result = wx.getStorageSync("key");\n';
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const item = {path: 'fixtures/storage/app.js', name: 'wx.getStorageSync', sha256, output: `${sha256}.txt`, language: 'javascript', ...excerpt(raw, 'wx.getStorageSync')};
  const manifest = {schemaVersion: 1, repository: 'weapp-container/weapp-container', commit: 'a'.repeat(40), groups: {storage: item}};
  await put('website/src/data/api-inventory-v1.json', JSON.stringify({apis: [{id: 'storage', names: ['wx.getStorageSync']}]}));
  await put('website/src/data/api-examples.json', JSON.stringify(manifest));
  await put(`website/api-example-sources/${item.output}`, raw);
  return {base, put, item, manifest};
}
test('API examples retain the exact source excerpt and raw bytes', async t => {
  const f = await fixture(t);
  assert.equal((await verifyApiExamples(f.base)).groups, 1);
  await f.put(`website/api-example-sources/${f.item.output}`, 'modified');
  await assert.rejects(verifyApiExamples(f.base), /snapshot differs/);
});
test('altered excerpt, unknown API and unlisted source are rejected', async t => {
  const f = await fixture(t);
  const original = f.item.code;
  f.item.code = 'invented example';
  await f.put('website/src/data/api-examples.json', JSON.stringify(f.manifest));
  await assert.rejects(verifyApiExamples(f.base), /excerpt differs/);
  f.item.code = original; f.item.name = 'wx.inventedApi';
  await f.put('website/src/data/api-examples.json', JSON.stringify(f.manifest));
  await assert.rejects(verifyApiExamples(f.base), /Unknown example API/);
  f.item.name = 'wx.getStorageSync';
  await f.put('website/src/data/api-examples.json', JSON.stringify(f.manifest));
  await f.put('website/api-example-sources/unlisted.txt', 'unreviewed');
  await assert.rejects(verifyApiExamples(f.base), /Unlisted/);
});
