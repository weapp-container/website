import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

test('DevTools download metadata points to the verified release assets', async () => {
  const release = JSON.parse(await readFile(resolve(root, 'website/src/data/devtools-release.json'), 'utf8'));
  assert.equal(release.version, '0.1.0-preview.7.1');
  assert.equal(release.tag, 'devtools-v0.1.0-preview.7.1');
  assert.equal(release.assets.length, 3);
  assert.match(release.checksumsUrl, /\/SHA256SUMS$/);
  for (const asset of release.assets) {
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(asset.size > 100_000_000);
    assert.match(asset.url, new RegExp(`/download/${release.tag}/${asset.filename}$`));
    assert.match(asset.filename, /^weapp-container-devtools-(?:macos-universal|linux-x86_64|windows-x86_64)\.(?:tar\.gz|zip)$/);
  }
  assert.deepEqual(release.assets.map(asset => asset.id), ['macos-universal', 'linux-x86_64', 'windows-x86_64']);
});

test('DevTools download page exposes every platform archive and checksum', async () => {
  const page = await readFile(resolve(root, 'website/src/components/DownloadPage.astro'), 'utf8');
  assert.match(page, /release\.assets\.map/);
  assert.match(page, /href=\{asset\.url\}/);
  assert.match(page, /asset\.sha256/);
  assert.match(page, /release\.checksumsUrl/);
});
