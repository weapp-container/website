import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = '0.1.0-preview.6.0';
export const RELEASE_TAG = `showcase-v${VERSION}-candidate10`;
export const sdkHostId = (family, platform) => family === 'react-native' ? 'react-native/android-ios' : family === 'flutter' ? platform === 'ios' ? 'flutter/ios' : ['android','macos'].includes(platform) ? 'flutter/android-ios-macos' : `flutter/${platform}` : `${family}/${platform}`;
const digest = value => createHash('sha256').update(value).digest('hex');
const hash = /^[a-f0-9]{64}$/;
export function safePath(value) {
  assert.ok(typeof value === 'string' && value.length && value.length < 1024 && !/[\\:\x00-\x20\x7f]/.test(value) && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe artifact path');
  return value;
}
export function exactReleaseTag(value) {
  const prefix = `showcase-v${VERSION}-candidate`;
  assert.ok(typeof value === 'string' && value.startsWith(prefix), 'An exact current Showcase candidate release tag is required');
  const candidate = value.slice(prefix.length);
  assert.ok(candidate.length > 0 && candidate[0] !== '0' && !/[^0-9]/.test(candidate), 'An exact current Showcase candidate release tag is required');
  return value;
}
export function validateSdkLock(lock) {
  assert.equal(lock.schemaVersion, 1); assert.equal(lock.format, 'showcase-sdk-artifacts/1');
  assert.equal(lock.runtimeVersion, VERSION, 'A current runtime lock is required');
  assert.equal(lock.profile, 'restricted-showcase');
  assert.ok(['weapp-container/runtime-artifacts', 'weapp-container/showcase'].includes(lock.repository), 'Use a reviewed private artifact repository');
  exactReleaseTag(lock.releaseTag);
  assert.ok(Array.isArray(lock.artifacts), 'SDK artifact inventory is required');
  for (const entry of lock.artifacts) {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'Invalid SDK artifact entry');
    assert.ok(!Object.hasOwn(entry, 'repository'), 'SDK artifact entries cannot override the reviewed repository');
    if (entry.releaseTag !== undefined) exactReleaseTag(entry.releaseTag);
  }
  return lock;
}
export function selectArtifact(lock, id) {
  validateSdkLock(lock);
  const matches = lock.artifacts.filter(item => item.id === id);
  assert.equal(matches.length, 1, `No exact current restricted SDK artifact for ${id}; build and publish it before installation`);
  const entry = matches[0];
  assert.ok(/^[a-z][a-z0-9/-]+$/.test(entry.id) && /^[a-z][a-z0-9-]+$/.test(entry.component));
  assert.equal(entry.runtimeVersion, VERSION); assert.equal(entry.profile, lock.profile);
  assert.ok(hash.test(entry.sha256) && hash.test(entry.packRoot) && hash.test(entry.policySha256) && hash.test(entry.producerReceiptSha256));
  assert.ok(Number.isSafeInteger(entry.size) && entry.size > 0 && entry.size < 2 * 1024 ** 3);
  safePath(entry.fileName); assert.ok(!entry.fileName.includes('/') && entry.fileName.endsWith('.tar.gz'));
  assert.ok(Array.isArray(entry.files) && entry.files.length > 0 && entry.files.length <= 30000);
  const paths = new Set();
  for (const file of entry.files) {
    safePath(file.path); assert.ok(!paths.has(file.path)); paths.add(file.path);
    assert.ok(hash.test(file.sha256) && Number.isSafeInteger(file.size) && file.size >= 0);
  }
  assert.ok(paths.has('showcase-distribution.json'), 'SDK archive needs compiled policy and pack bindings');
  return { ...entry, releaseTag: exactReleaseTag(entry.releaseTag === undefined ? lock.releaseTag : entry.releaseTag) };
}
export async function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
  const stdout = [], stderr = [];
  child.stdout?.on('data', bytes => stdout.push(bytes)); child.stderr?.on('data', bytes => stderr.push(bytes));
  const code = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', accept); });
  if (code !== 0) {
    let diagnostics = Buffer.concat([...stdout, ...stderr]).toString().slice(-12000);
    for (const [key, value] of Object.entries({ ...process.env, ...options.env })) {
      if (/TOKEN|PASSWORD|SECRET|CREDENTIAL|PRIVATE_KEY/i.test(key) && typeof value === 'string' && value.length >= 3) diagnostics = diagnostics.split(value).join('[redacted]');
    }
    throw Error(`${command} failed (exit ${code})\n${diagnostics}`);
  }
  return Buffer.concat(stdout).toString();
}
export async function verifyInstallation(directory, id) {
  const installation = JSON.parse(await readFile(resolve(directory, '.showcase-install.json'), 'utf8'));
  assert.equal(installation.schemaVersion, 1); assert.equal(installation.id, id);
  assert.equal(installation.binding.runtimeVersion, VERSION); assert.equal(installation.binding.profile, 'restricted-showcase');
  const lock = JSON.parse(await readFile(resolve(ROOT, 'platforms/sdk-artifacts.lock.json'), 'utf8'));
  const entry = selectArtifact(lock, id);
  assert.equal(installation.archiveSha256, entry.sha256, 'Installed SDK differs from the current reviewed lock');
  assert.deepEqual(installation.files, entry.files);
  for (const key of ['runtimeVersion', 'profile', 'packRoot', 'policySha256', 'component', 'target', 'producerReceiptSha256']) assert.equal(installation.binding[key], entry[key]);
  const expected = new Set(entry.files.map(file => file.path));
  const visit = async (parent, relative = '') => {
    for (const item of await readdir(parent, { withFileTypes: true })) {
      const path = relative ? `${relative}/${item.name}` : item.name;
      if (path === '.showcase-install.json') continue;
      assert.ok(!item.isSymbolicLink(), 'Installed SDK cannot contain links');
      if (item.isDirectory()) await visit(resolve(parent, item.name), path);
      else assert.ok(item.isFile() && expected.has(path), `Unexpected installed SDK file: ${path}`);
    }
  };
  await visit(directory);
  for (const file of entry.files) {
    const path = resolve(directory, safePath(file.path)), info = await lstat(path);
    assert.ok(info.isFile() && !info.isSymbolicLink() && info.size === file.size, `Installed SDK size/type differs: ${file.path}`);
    assert.equal(digest(await readFile(path)), file.sha256, `Installed SDK content differs: ${file.path}`);
  }
  return installation;
}
const extract = String.raw`import hashlib,json,os,sys,tarfile
from pathlib import Path
j=json.load(sys.stdin); root=Path(j['destination']); root.mkdir()
expected={f['path']:f for f in j['files']}; seen=set(); total=0
with tarfile.open(j['archive'],'r:gz') as archive:
 for m in archive:
  p=m.name.rstrip('/')
  if not p or p.startswith('/') or '\\' in p or ':' in p or any(ord(c)<=32 or ord(c)==127 for c in p) or any(c in ('','.','..') for c in p.split('/')):raise ValueError('unsafe archive member')
  if any(c in ('.git','source','crates','cargo-target','.private') or c.endswith('.dSYM') for c in p.split('/')) or p.endswith(('.rs','.pdb','.map','.debug','.symbols')) or p.endswith('Cargo.toml'):raise ValueError('private source or symbol data in SDK')
  if m.isdir():continue
  if not m.isfile() or p in seen or p not in expected:raise ValueError('unreviewed member/link')
  f=expected[p];total+=m.size
  if m.size!=f['size'] or m.size>512*1024*1024 or total>2*1024*1024*1024:raise ValueError('archive size limit')
  data=archive.extractfile(m).read(m.size+1)
  if len(data)!=m.size or hashlib.sha256(data).hexdigest()!=f['sha256']:raise ValueError('member digest mismatch')
  target=root/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);os.chmod(target,0o755 if m.mode&0o111 else 0o644);seen.add(p)
if seen!=set(expected):raise ValueError('archive closure mismatch')
`;
export async function unpack(archive, destination, entry) {
  const child = spawn(process.env.PYTHON || 'python3', ['-c', extract], { stdio: ['pipe', 'ignore', 'pipe'] });
  const stderr = []; child.stderr.on('data', bytes => stderr.push(bytes));
  child.stdin.end(JSON.stringify({ archive, destination, files: entry.files }));
  const code = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', accept); });
  assert.equal(code, 0, 'SDK archive rejected by bounded path/size/hash extraction');
}
export async function install({ manifest = resolve(ROOT, 'platforms/sdk-artifacts.lock.json'), id, offline, destination }, { runCommand = run } = {}) {
  const lock = JSON.parse(await readFile(manifest, 'utf8')), entry = selectArtifact(lock, id);
  const target = resolve(destination || resolve(ROOT, '.runtime/sdk', id));
  const parent = dirname(target); await mkdir(parent, { recursive: true });
  assert.equal(await realpath(parent), parent, 'Use a canonical SDK installation parent');
  const work = resolve(parent, `.sdk-install-${randomUUID()}`); await mkdir(work);
  try {
    let archive;
    if (offline) archive = resolve(offline, entry.fileName);
    else {
      const token = process.env.WEAPP_CONTAINER_RUNTIME_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
      await runCommand('gh', ['release', 'download', entry.releaseTag, '--repo', lock.repository, '--pattern', entry.fileName, '--dir', work], { env: { ...process.env, ...(token ? { GH_TOKEN: token } : {}) } });
      archive = resolve(work, entry.fileName);
    }
    const metadata = await stat(archive); assert.ok(metadata.isFile() && metadata.size === entry.size, 'SDK archive size mismatch');
    const actual = createHash('sha256'); for await (const bytes of createReadStream(archive)) actual.update(bytes);
    assert.equal(actual.digest('hex'), entry.sha256, 'SDK archive SHA-256 mismatch');
    const prepared = resolve(work, 'prepared'); await unpack(archive, prepared, entry);
    const binding = JSON.parse(await readFile(resolve(prepared, 'showcase-distribution.json'), 'utf8'));
    for (const key of ['runtimeVersion', 'profile', 'packRoot', 'policySha256', 'component', 'target', 'producerReceiptSha256']) assert.equal(binding[key], entry[key], `SDK binding differs: ${key}`);
    // Existing installations are never overwritten or silently reused.
    try { await stat(target); throw Error(`Installation already exists: ${target}; select a fresh --destination`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(resolve(prepared, '.showcase-install.json'), JSON.stringify({ schemaVersion: 1, id, archiveSha256: entry.sha256, lockSha256: digest(await readFile(manifest)), binding, files: entry.files }, null, 2) + '\n');
    await rename(prepared, target);
    return { status: 'installed-verified', id, destination: target, archiveSha256: entry.sha256 };
  } finally { await rm(work, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), values = {};
    const keys = { '--manifest': 'manifest', '--id': 'id', '--offline': 'offline', '--destination': 'destination' };
    for (let index = 0; index < args.length; index += 2) { assert.ok(keys[args[index]] && args[index + 1] && values[keys[args[index]]] === undefined, 'Unknown/duplicate/missing SDK install option'); values[keys[args[index]]] = args[index + 1]; }
    assert.ok(values.id, '--id is required'); console.log(JSON.stringify(await install(values)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
