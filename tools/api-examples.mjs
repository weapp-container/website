#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = 'website/src/data/api-examples.json';
const rawPath = 'website/api-example-sources';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function excerpt(source, name) {
  const lines = source.split('\n');
  const found = lines.findIndex(line => line.includes(name));
  assert.ok(found >= 0, `Example no longer refers to ${name}`);
  const startLine = Math.max(0, found - 4) + 1, endLine = Math.min(lines.length, found + 12);
  return {startLine, endLine, code: lines.slice(startLine - 1, endLine).join('\n')};
}
export async function verifyApiExamples(base = root) {
  const manifest = JSON.parse(await readFile(resolve(base, manifestPath), 'utf8'));
  assert.equal(manifest.schemaVersion, 1); assert.match(manifest.commit, /^[a-f0-9]{40}$/);
  const inventory = JSON.parse(await readFile(resolve(base, 'website/src/data/api-inventory-v1.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.groups).sort(), inventory.apis.map(api => api.id).sort());
  const paths = new Set();
  for (const api of inventory.apis) {
    const item = manifest.groups[api.id];
    assert.ok(item.path && api.names.includes(item.name), `Unknown example API: ${api.id}`);
    assert.equal(item.output, `${item.sha256}.txt`); paths.add(item.output);
    const bytes = await readFile(resolve(base, rawPath, item.output));
    assert.equal(sha(bytes), item.sha256, 'Example source snapshot differs');
    assert.deepEqual(excerpt(bytes.toString(), item.name), {startLine: item.startLine, endLine: item.endLine, code: item.code}, 'Example excerpt differs from its source');
  }
  assert.deepEqual((await readdir(resolve(base, rawPath))).sort(), [...paths].sort(), 'Unlisted API example source');
  return {groups: inventory.apis.length, sources: paths.size, commit: manifest.commit};
}

async function synchronize(sourceRoot) {
  const git = (...args) => execFileSync('git', ['-C', sourceRoot, ...args], {maxBuffer: 32 * 1024 * 1024});
  const commit = git('rev-parse', 'HEAD').toString().trim();
  const inventory = JSON.parse(await readFile(resolve(root, 'website/src/data/api-inventory-v1.json'), 'utf8'));
  // Exact source allowlist: local engine/protocol tests and fixed public fixtures.
  const paths = git('ls-tree', '-r', '--name-only', commit, 'fixtures', 'conformance/fixtures', 'crates/container-runtime', 'crates/container-engine-quickjs').toString().trim().split('\n').filter(path => /\.(?:rs|js|wxml)$/.test(path));
  const sources = paths.map(path => ({path, bytes: git('show', `${commit}:${path}`)}));
  const manifest = {schemaVersion: 1, repository: 'weapp-container/weapp-container', commit, groups: {}};
  await mkdir(resolve(root, rawPath), {recursive: true});
  for (const api of inventory.apis) {
    const candidates = sources.flatMap(source => api.names.filter(name => source.bytes.includes(name)).map(name => ({...source, name})));
    candidates.sort((a, b) => Number(/fixture|tests/.test(b.path)) - Number(/fixture|tests/.test(a.path)) || a.bytes.length - b.bytes.length);
    assert.ok(candidates.length, `Select a source-backed example for ${api.id}`);
    const source = candidates[0], sha256 = sha(source.bytes), output = `${sha256}.txt`;
    await writeFile(resolve(root, rawPath, output), source.bytes);
    manifest.groups[api.id] = {path: source.path, name: source.name, sha256, output, language: source.path.endsWith('.rs') ? 'rust' : source.path.endsWith('.wxml') ? 'xml' : 'javascript', ...excerpt(source.bytes.toString(), source.name)};
  }
  await writeFile(resolve(root, manifestPath), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(await verifyApiExamples()));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--check') console.log(JSON.stringify(await verifyApiExamples()));
  else {assert.equal(args.length, 2); assert.equal(args[0], '--source-root'); await synchronize(resolve(args[1]));}
}
