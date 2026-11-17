import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const marker = '# Generated from the verified Showcase SDK inventory.';

// Consumers bind to package names. The authenticated file inventory owns the
// archive's container directory, which may be flat or under packages/.
export async function stageFlutterSdkDependency({ sdkDirectory, hostDirectory, installation, platform }) {
  assert.equal(installation.binding.component, 'flutter-sdk');
  assert.ok(['android', 'ios', 'macos', 'windows', 'linux'].includes(platform));
  const files = new Map(installation.files.map(file => [file.path, file]));
  assert.equal(files.size, installation.files.length, 'Duplicate SDK inventory path');
  const roots = ['', 'packages/'].filter(root => files.has(`${root}weapp_container/pubspec.yaml`));
  assert.equal(roots.length, 1, 'SDK must contain one unambiguous Flutter package root');
  const root = roots[0];
  for (const name of ['weapp_container', 'weapp_container_platform_interface', `weapp_container_${platform}`]) {
    const path = `${root}${name}/pubspec.yaml`, expected = files.get(path);
    assert.ok(expected, `SDK omits the selected Flutter package: ${name}`);
    const bytes = await readFile(resolve(sdkDirectory, path));
    assert.equal(bytes.length, expected.size, 'Flutter package manifest size differs');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, 'Flutter package manifest hash differs');
  }
  const path = resolve(hostDirectory, 'pubspec_overrides.yaml');
  try {
    assert.ok((await readFile(path, 'utf8')).startsWith(marker + '\n'), 'Existing Flutter dependency overrides are not owned by this build');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const dependency = relative(hostDirectory, resolve(sdkDirectory, root, 'weapp_container')).replaceAll('\\', '/');
  assert.ok(dependency && !dependency.startsWith('/') && !/^[A-Za-z]:/.test(dependency), 'Flutter SDK must share the consumer filesystem');
  await writeFile(path, `${marker}\ndependency_overrides:\n  weapp_container:\n    path: ${JSON.stringify(dependency)}\n`);
  return { packageRoot: root ? 'packages' : '.', dependency, archiveSha256: installation.archiveSha256 };
}
