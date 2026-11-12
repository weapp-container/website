import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, VERSION, RELEASE_TAG, WEBSITE_REPOSITORY, isWebsiteArtifactRepository, exactReleaseTag, run, safePath, selectArtifact, unpack } from './sdk-install.mjs';
import { FONT_FILES, verifyFonts } from './native-font.mjs';
import { releaseStorageRepository } from './legacy-release-storage.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const lockPath = resolve(ROOT, 'platforms/miniapp-artifact.lock.json');
const sdkLockPath = resolve(ROOT, 'platforms/sdk-artifacts.lock.json');
const historyCatalogPath = resolve(ROOT, 'platforms/miniapp-artifacts.catalog.json');
export async function createPackArtifact({ source = resolve(ROOT, 'artifacts/miniapp'), fonts = resolve(ROOT, '.runtime/fonts') } = {}) {
  const files = [];
  await verifyFonts(fonts); await mkdir(resolve(source, 'fonts'), { recursive: true });
  for (const file of FONT_FILES) await cp(resolve(fonts, file.path), resolve(source, 'fonts', file.path));
  const selected = ['policy.json', 'pack/manifest.json', ...FONT_FILES.map(file => `fonts/${file.path}`)];
  for (const item of await readdir(resolve(source, 'pack/blobs/sha256'), { withFileTypes: true })) {
    assert.ok(item.isFile() && /^[a-f0-9]{64}$/.test(item.name)); selected.push(`pack/blobs/sha256/${item.name}`);
  }
  for (const path of selected.sort()) {
    const bytes = await readFile(resolve(source, path));
    assert.ok((await lstat(resolve(source, path))).isFile());
    if (path.startsWith('pack/blobs/')) assert.equal(sha(bytes), path.split('/').at(-1));
    files.push({ path, size: bytes.length, sha256: sha(bytes) });
  }
  const packRoot = JSON.parse(await readFile(resolve(source, 'pack/manifest.json'), 'utf8')).integrity.root;
  const policy = JSON.parse(await readFile(resolve(source, 'policy.json'), 'utf8'));
  assert.deepEqual(policy.allowedPackRoots, [packRoot]);
  const policySha256 = sha(JSON.stringify({ allowedApis: [...policy.allowedApis].sort(), allowedPackRoots: [packRoot], schemaVersion: 1 }));
  const out = resolve(ROOT, 'artifacts/private'); await mkdir(out, { recursive: true });
  const fileName = `showcase-miniapp-${VERSION}-${packRoot.slice(0,12)}.tar.gz`, archivePath = resolve(out, fileName);
  await run(process.env.PYTHON || 'python3', ['-c', `import gzip,json,pathlib,sys,tarfile
root=pathlib.Path(sys.argv[1]);files=json.loads(sys.argv[3])
with open(sys.argv[2],'xb') as raw:
 with gzip.GzipFile(fileobj=raw,mode='wb',filename='',mtime=0) as compressed:
  with tarfile.open(fileobj=compressed,mode='w') as archive:
   for item in files:
    path=root/item['path'];info=archive.gettarinfo(str(path),arcname=item['path']);info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
    with path.open('rb') as content:archive.addfile(info,content)`, source, archivePath, JSON.stringify(files)]);
  const archive = await readFile(archivePath);
  const lock = { schemaVersion: 1, format: 'showcase-miniapp-artifact/1', runtimeVersion: VERSION, profile: 'restricted-showcase', repository: WEBSITE_REPOSITORY, releaseTag: RELEASE_TAG, packRoot, policySha256, fileName, size: archive.length, sha256: sha(archive), files };
  await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
  return { archive: archivePath, packRoot, policySha256, sha256: lock.sha256 };
}
export function selectPackArtifact(lock) {
  assert.equal(lock.schemaVersion, 1); assert.equal(lock.format, 'showcase-miniapp-artifact/1'); assert.equal(lock.runtimeVersion, VERSION);
  assert.equal(lock.profile, 'restricted-showcase'); assert.ok(isWebsiteArtifactRepository(lock.repository), 'Use the current website repository or an exact legacy showcase pin'); exactReleaseTag(lock.releaseTag);
  assert.match(lock.packRoot, /^[a-f0-9]{64}$/); assert.match(lock.policySha256, /^[a-f0-9]{64}$/); assert.match(lock.sha256, /^[a-f0-9]{64}$/);
  safePath(lock.fileName); assert.ok(!lock.fileName.includes('/') && lock.fileName.endsWith('.tar.gz'));
  assert.ok(Number.isSafeInteger(lock.size) && lock.size > 0 && lock.size < 64 * 1024 * 1024);
  const paths = new Set();
  for (const file of lock.files) {
    assert.match(file.path, /^(policy\.json|pack\/manifest\.json|pack\/blobs\/sha256\/[a-f0-9]{64}|fonts\/(NotoSansSC\.ttf|OFL\.txt))$/); assert.ok(!paths.has(file.path)); paths.add(file.path);
    assert.match(file.sha256, /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(file.size) && file.size >= 0 && file.size < 32 * 1024 * 1024);
  }
  assert.ok(paths.has('policy.json') && paths.has('pack/manifest.json'));
  for (const file of FONT_FILES) assert.deepEqual(lock.files.find(item => item.path === `fonts/${file.path}`), { ...file, path: `fonts/${file.path}` });
  return lock;
}
export async function resolvePackArtifact(sdkId, { readLock = readFile } = {}) {
  const current = selectPackArtifact(JSON.parse(await readLock(lockPath, 'utf8')));
  if (sdkId === undefined) return current;
  assert.ok(typeof sdkId === 'string' && /^[a-z][a-z0-9/-]+$/.test(sdkId), 'An exact reviewed SDK id is required');
  const sdk = selectArtifact(JSON.parse(await readLock(sdkLockPath, 'utf8')), sdkId);
  let selected = current;
  if (sdk.packRoot !== current.packRoot) {
    const catalog = JSON.parse(await readLock(historyCatalogPath, 'utf8'));
    assert.deepEqual(Object.keys(catalog).sort(), ['entries', 'format', 'runtimeVersion', 'schemaVersion']);
    assert.equal(catalog.schemaVersion, 1); assert.equal(catalog.format, 'showcase-miniapp-history/1'); assert.equal(catalog.runtimeVersion, VERSION);
    assert.ok(Array.isArray(catalog.entries) && catalog.entries.length <= 100, 'A reviewed historical pack catalog is required');
    const roots = new Set();
    for (const item of catalog.entries) {
      assert.deepEqual(Object.keys(item).sort(), ['lockSha256', 'packRoot'], 'Historical pack entries cannot override paths, repositories or release tags');
      assert.match(item.packRoot, /^[a-f0-9]{64}$/); assert.match(item.lockSha256, /^[a-f0-9]{64}$/);
      assert.ok(!roots.has(item.packRoot), 'Duplicate historical pack root'); roots.add(item.packRoot);
    }
    const registered = catalog.entries.find(item => item.packRoot === sdk.packRoot);
    assert.ok(registered, `No reviewed pack artifact for SDK ${sdkId} root ${sdk.packRoot}`);
    // The SDK only selects a hash from the reviewed catalog. It never provides
    // a path, repository or release tag to the pack downloader.
    const bytes = await readLock(resolve(ROOT, 'platforms/miniapp-history', `${registered.packRoot}.lock.json`));
    assert.equal(sha(bytes), registered.lockSha256, 'Historical pack lock SHA-256 mismatch');
    selected = selectPackArtifact(JSON.parse(bytes));
  }
  assert.equal(selected.packRoot, sdk.packRoot, 'Selected pack root differs from the reviewed SDK');
  assert.equal(selected.policySha256, sdk.policySha256, 'Selected pack policy differs from the reviewed SDK');
  return selected;
}
export async function installPackArtifact({ offline, sdkId, destination = resolve(ROOT, 'artifacts/miniapp') } = {}, { readLock = readFile, runCommand = run } = {}) {
  const lock = await resolvePackArtifact(sdkId, { readLock });
  await mkdir(dirname(destination), { recursive: true }); const work = resolve(dirname(destination), `.pack-install-${randomUUID()}`); await mkdir(work);
  try {
    if (!offline) await runCommand('gh', ['release', 'download', lock.releaseTag, '--repo', releaseStorageRepository(lock.repository, lock.releaseTag), '--pattern', lock.fileName, '--dir', work]);
    const archive = resolve(offline || work, lock.fileName), bytes = await readFile(archive);
    assert.equal(bytes.length, lock.size, 'Pack archive size mismatch'); assert.equal(sha(bytes), lock.sha256, 'Pack archive SHA-256 mismatch');
    const prepared = resolve(work, 'prepared'); await unpack(archive, prepared, lock);
    const manifest = JSON.parse(await readFile(resolve(prepared, 'pack/manifest.json'), 'utf8')), policy = JSON.parse(await readFile(resolve(prepared, 'policy.json'), 'utf8'));
    assert.equal(manifest.integrity.root, lock.packRoot); assert.deepEqual(policy.allowedPackRoots, [lock.packRoot]);
    assert.equal(sha(JSON.stringify({ allowedApis: [...policy.allowedApis].sort(), allowedPackRoots: [lock.packRoot], schemaVersion: 1 })), lock.policySha256);
    await verifyFonts(resolve(prepared, 'fonts'));
    try { await stat(destination); throw Error('Pack destination already exists; use a fresh --destination'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await rename(prepared, destination);
    return { status: 'installed-verified', destination, packRoot: lock.packRoot, policySha256: lock.policySha256 };
  } finally { await rm(work, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), create = args.shift() === '--create', values = {};
    if (!create) assert.equal(process.argv[2], '--install', 'Choose --create or --install');
    for (let index = 0; index < args.length; index += 2) { const key = (create ? { '--source': 'source', '--fonts': 'fonts' } : { '--offline': 'offline', '--destination': 'destination', '--sdk-id': 'sdkId' })[args[index]]; assert.ok(key && args[index+1] && !values[key], 'Unknown/duplicate/missing pack artifact option'); values[key] = key === 'sdkId' ? args[index+1] : resolve(args[index+1]); }
    console.log(JSON.stringify(create ? await createPackArtifact(values) : await installPackArtifact(values)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
