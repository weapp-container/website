import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {detectMacArchitecture} from '../../website/src/data/client-architecture.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

test('DevTools download metadata exposes architecture-specific installers', async () => {
  const release = JSON.parse(await readFile(resolve(root, 'website/src/data/devtools-release.json'), 'utf8'));
  assert.equal(release.schemaVersion, 2);
  assert.equal(release.version, '0.1.0-preview.7.3');
  assert.equal(release.tag, 'devtools-v0.1.0-preview.7.3');
  assert.equal(release.platforms.length, 4);
  assert.match(release.checksumsUrl, /\/SHA256SUMS$/);
  const expectedAssets = {
    'macos-arm64': 'weapp-container-devtools-macos-arm64.dmg',
    'macos-x86_64': 'weapp-container-devtools-macos-x86_64.dmg',
    'linux-x86_64': 'weapp-container-devtools-linux-x86_64.deb',
    'windows-x86_64': 'weapp-container-devtools-windows-x86_64.msi',
  };
  for (const platform of release.platforms) {
    assert.deepEqual(Object.keys(platform).sort(), ['id', 'installer']);
    const asset = platform.installer;
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(asset.size > 100_000_000);
    assert.match(asset.url, new RegExp(`/download/${release.tag}/${asset.filename}$`));
    assert.equal(asset.filename, expectedAssets[platform.id]);
  }
  assert.deepEqual(release.platforms.map(platform => platform.id), ['macos-arm64', 'macos-x86_64', 'linux-x86_64', 'windows-x86_64']);
  assert.equal(release.platforms.filter(platform => /\.tar\.gz$|\.zip$/i.test(platform.installer.filename)).length, 0);
});

test('DevTools download page exposes direct installer downloads', async () => {
  const page = await readFile(resolve(root, 'website/src/components/DownloadPage.astro'), 'utf8');
  assert.match(page, /release\.platforms\.map/);
  assert.match(page, /href=\{installer\.url\}/);
  assert.match(page, /download-installer/);
  assert.match(page, /installer\.sha256/);
  assert.match(page, /下载安装包/);
  assert.match(page, /release\.checksumsUrl/);
  assert.match(page, /detectMacArchitecture/);
  assert.match(page, /data-recommendation/);
  assert.match(page, /请选择适合你 Mac 处理器的安装包/);
  assert.doesNotMatch(page, /location\.(?:href|assign|replace)\s*=/);
});

test('macOS recommendation requires an explicit 64-bit platform and architecture hint', async () => {
  const hints = values => ({
    platform: 'macOS',
    getHighEntropyValues: async keys => {
      assert.deepEqual(keys, ['architecture', 'bitness']);
      return values;
    },
  });
  assert.equal(await detectMacArchitecture(hints({architecture: 'arm', bitness: '64'})), 'macos-arm64');
  assert.equal(await detectMacArchitecture(hints({architecture: 'x86', bitness: '64'})), 'macos-x86_64');
  assert.equal(await detectMacArchitecture(hints({architecture: 'arm', bitness: '32'})), null);
  assert.equal(await detectMacArchitecture(hints({architecture: 'unknown', bitness: '64'})), null);
  assert.equal(await detectMacArchitecture({platform: 'macOS'}), null);
  assert.equal(await detectMacArchitecture({platform: 'Linux', getHighEntropyValues: async () => ({architecture: 'x86', bitness: '64'})}), null);
  assert.equal(await detectMacArchitecture(hints(new Error('unavailable'))), null);
});
