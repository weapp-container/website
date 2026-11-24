import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

test('DevTools download metadata points to the verified release assets', async () => {
  const release = JSON.parse(await readFile(resolve(root, 'website/src/data/devtools-release.json'), 'utf8'));
  assert.equal(release.schemaVersion, 2);
  assert.equal(release.version, '0.1.0-preview.7.2');
  assert.equal(release.tag, 'devtools-v0.1.0-preview.7.2');
  assert.equal(release.platforms.length, 3);
  assert.match(release.checksumsUrl, /\/SHA256SUMS$/);
  const expectedAssets = {
    'macos-universal': [
      ['weapp-container-devtools-macos-universal.dmg', 365743960, 'e1163da19ad3ea693c1b85e56b6926cdecec0fff82a874b2ef01f686140d7a47'],
      ['weapp-container-devtools-macos-universal.tar.gz', 243695667, 'd78ab822813f9609ee4cb10f4d62d9e929df93b4b169e91c640a49c5ec312e94'],
    ],
    'linux-x86_64': [
      ['weapp-container-devtools-linux-x86_64.deb', 143672648, '39dbcdb052152a0172fa689b665d9950773e4bdaf0fad7121c9789a97aa331d8'],
      ['weapp-container-devtools-linux-x86_64.tar.gz', 195784600, '582d06d8bdec0941f581b4089f98d1df81e78e4f7d72c52d5d8c9aa4c58e3ef6'],
    ],
    'windows-x86_64': [
      ['weapp-container-devtools-windows-x86_64.msi', 147012123, '883ea082bf5b34adce0fdeb1de44d64abbbcf912db54e9c785ad85173e74c227'],
      ['weapp-container-devtools-windows-x86_64.zip', 150501741, '5c4a77db65b0373334b53ac0f1d028e17bdaa16089102aa5f07730953659368d'],
    ],
  };
  for (const platform of release.platforms) {
    assert.deepEqual(Object.keys(platform).sort(), ['id', 'installer', 'portable']);
    for (const [index, asset] of [platform.installer, platform.portable].entries()) {
      assert.match(asset.sha256, /^[a-f0-9]{64}$/);
      assert.ok(asset.size > 100_000_000);
      assert.match(asset.url, new RegExp(`/download/${release.tag}/${asset.filename}$`));
      assert.deepEqual([asset.filename, asset.size, asset.sha256], expectedAssets[platform.id][index]);
    }
  }
  assert.deepEqual(release.platforms.map(platform => platform.id), ['macos-universal', 'linux-x86_64', 'windows-x86_64']);
});

test('DevTools download page exposes installer-first and portable downloads', async () => {
  const page = await readFile(resolve(root, 'website/src/components/DownloadPage.astro'), 'utf8');
  assert.match(page, /release\.platforms\.map/);
  assert.match(page, /href=\{installer\.url\}/);
  assert.match(page, /href=\{portable\.url\}/);
  assert.match(page, /download-installer/);
  assert.match(page, /download-portable/);
  assert.match(page, /installer\.sha256/);
  assert.match(page, /portable\.sha256/);
  assert.match(page, /下载安装包/);
  assert.match(page, /下载便携包/);
  assert.match(page, /release\.checksumsUrl/);
});
