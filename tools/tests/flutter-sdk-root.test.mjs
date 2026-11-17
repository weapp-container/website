import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { stageFlutterSdkDependency } from '../flutter-sdk-root.mjs';
async function fixture(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), 'showcase-flutter-root-')); t.after(() => rm(root, { recursive: true, force: true }));
  const sdkDirectory = join(root, 'sdk'), hostDirectory = join(root, 'host'); await mkdir(hostDirectory);
  const files = [];
  for (const name of ['weapp_container', 'weapp_container_platform_interface', 'weapp_container_linux']) {
    const path = `${prefix}${name}/pubspec.yaml`, bytes = Buffer.from(`name: ${name}\n`), file = join(sdkDirectory, path);
    await mkdir(dirname(file), { recursive: true }); await writeFile(file, bytes);
    files.push({ path, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return { sdkDirectory, hostDirectory, installation: { binding: { component: 'flutter-sdk' }, files, archiveSha256: 'a'.repeat(64) }, platform: 'linux' };
}
test('verified flat and nested SDKs bind the same consumer package without changing the archive', async t => {
  for (const prefix of ['', 'packages/']) {
    const f = await fixture(t, prefix), result = await stageFlutterSdkDependency(f);
    assert.equal(result.packageRoot, prefix ? 'packages' : '.');
    assert.match(await readFile(join(f.hostDirectory, 'pubspec_overrides.yaml'), 'utf8'), new RegExp(`path: "../sdk/${prefix}weapp_container"`));
    assert.deepEqual(await stageFlutterSdkDependency(f), result);
  }
});
test('missing, ambiguous and altered selected packages fail before dependency resolution', async t => {
  for (const mode of ['missing', 'ambiguous', 'altered']) {
    const f = await fixture(t, 'packages/');
    if (mode === 'missing') f.installation.files = f.installation.files.filter(file => !file.path.includes('weapp_container_linux/'));
    else if (mode === 'ambiguous') f.installation.files.push({ ...f.installation.files[0], path: 'weapp_container/pubspec.yaml' });
    else await writeFile(join(f.sdkDirectory, 'packages/weapp_container/pubspec.yaml'), 'tampered package');
    await assert.rejects(stageFlutterSdkDependency(f), /omits|unambiguous|differs/);
  }
});
test('consumer builds preserve overrides they do not own', async t => {
  const f = await fixture(t, '');
  const path = join(f.hostDirectory, 'pubspec_overrides.yaml'); await writeFile(path, '# User-owned overrides\n');
  await assert.rejects(stageFlutterSdkDependency(f), /not owned/);
  assert.equal(await readFile(path, 'utf8'), '# User-owned overrides\n');
});
