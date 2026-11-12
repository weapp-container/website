import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://container.weapp.dev';
const LIMIT = 25 * 1024 * 1024;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function safePath(path) {
  assert.ok(typeof path === 'string' && /^[A-Za-z0-9_./+-]+$/.test(path) && !path.startsWith('/') && path.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe public demo path');
  return path;
}
function pin(value) { assert.match(value.sha256, /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(value.size) && value.size > 0 && value.size <= LIMIT); }
async function checkedFile(path, expected) {
  try { const info = await lstat(path); assert.ok(info.isFile() && !info.isSymbolicLink(), 'Public demo cache must contain regular files'); const bytes = await readFile(path); if (bytes.length === expected.size && sha(bytes) === expected.sha256) return bytes; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return null;
}
async function download(path, expected, fetchImpl) {
  safePath(path); pin(expected);
  // Workers Static Assets serves HTML at its canonical URL. Keep redirects
  // disabled and still verify the response against the original file pin.
  const requestPath = path.endsWith('/index.html') ? path.slice(0, -10) : path.endsWith('.html') ? path.slice(0, -5) : path;
  const encodedPath = requestPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetchImpl(`${ORIGIN}/${encodedPath}`, { redirect: 'error', signal: AbortSignal.timeout(60_000) });
  assert.equal(response.status, 200, 'Public demo download was refused');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; assert.ok(size <= expected.size, 'Public demo response exceeded its pin'); chunks.push(chunk); }
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.length, expected.size, 'Public demo size differs'); assert.equal(sha(bytes), expected.sha256, 'Public demo hash differs');
  return bytes;
}
async function verifyTree(directory, inventory) {
  const actual = [];
  async function walk(parent, prefix = '') {
    for (const item of await readdir(parent, { withFileTypes: true })) {
      const path = prefix + item.name;
      assert.ok(!item.isSymbolicLink(), 'Public demo links are forbidden');
      if (item.isDirectory()) await walk(resolve(parent, item.name), path + '/');
      else { assert.ok(item.isFile()); actual.push(path); }
    }
  }
  await walk(directory);
  assert.deepEqual(actual.sort(), [...inventory.files.map(file => file.path), 'deployment-inventory.json'].sort(), 'Public demo cache contains unreviewed files');
  for (const file of inventory.files) assert.ok(await checkedFile(resolve(directory, file.path), file), `Public demo cache differs: ${file.path}`);
}

/** Reproduce only the fixed public demo. No GitHub token or private build receipts. */
export async function preparePublicDemo({ lockPath = resolve(ROOT, 'platforms/public-demo.lock.json'), publicDirectory = resolve(ROOT, 'website/public'), fetchImpl = fetch } = {}) {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  assert.equal(lock.schemaVersion, 1); assert.equal(lock.origin, ORIGIN); pin(lock.config); pin(lock.inventory);
  // Versioned metadata keeps future site deployments from changing this build.
  const snapshotDirectory = resolve(dirname(lockPath), 'public-demo');
  const configBytes = await checkedFile(resolve(snapshotDirectory, 'showcase-runtime.json'), lock.config);
  assert.ok(configBytes, 'Public demo config snapshot differs from its pin');
  const config = JSON.parse(configBytes);
  assert.match(config.deploymentHash, /^[a-f0-9]{64}$/);
  assert.equal(config.entry, `/runtime/${config.deploymentHash}/index.html`); assert.equal(config.distributionProfile, 'restricted-showcase');
  const relativeRoot = `runtime/${config.deploymentHash}`, target = resolve(publicDirectory, relativeRoot);
  const inventoryBytes = await checkedFile(resolve(snapshotDirectory, 'deployment-inventory.json'), lock.inventory);
  assert.ok(inventoryBytes, 'Public demo inventory snapshot differs from its pin');
  const inventory = JSON.parse(inventoryBytes);
  assert.equal(inventory.packRoot, config.packRoot); assert.equal(inventory.policySha256, config.policySha256);
  assert.ok(Array.isArray(inventory.files) && inventory.files.length > 0 && inventory.files.length <= 4000);
  const paths = new Set(); let total = 0;
  for (const file of inventory.files) { safePath(file.path); pin(file); assert.ok(file.path !== 'deployment-inventory.json' && !paths.has(file.path), 'Duplicate public demo file'); paths.add(file.path); total += file.size; }
  assert.ok(total <= 250 * 1024 * 1024, 'Public demo exceeded its total bound');
  let targetExists = true;
  try { const info = await lstat(target); assert.ok(info.isDirectory() && !info.isSymbolicLink()); }
  catch (error) { if (error.code !== 'ENOENT') throw error; targetExists = false; }
  if (targetExists) await verifyTree(target, inventory);
  else {
    await mkdir(dirname(target), { recursive: true });
    const temporary = await mkdtemp(resolve(dirname(target), '.public-demo-'));
    try {
      let next = 0;
      const results = await Promise.allSettled(Array.from({ length: 4 }, async () => {
        while (next < inventory.files.length) {
          const file = inventory.files[next++], bytes = await download(`${relativeRoot}/${file.path}`, file, fetchImpl);
          const path = resolve(temporary, file.path); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { flag: 'wx' });
        }
      }));
      const failure = results.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
      await writeFile(resolve(temporary, 'deployment-inventory.json'), inventoryBytes, { flag: 'wx' });
      await verifyTree(temporary, inventory); await rename(temporary, target);
    } finally { await rm(temporary, { recursive: true, force: true }); }
  }
  const configTemporary = resolve(publicDirectory, '.showcase-runtime.json.tmp');
  try { await writeFile(configTemporary, configBytes, { flag: 'wx' }); await rename(configTemporary, resolve(publicDirectory, 'showcase-runtime.json')); }
  finally { await rm(configTemporary, { force: true }); }
  return { status: 'verified-public-demo', deploymentHash: config.deploymentHash, files: inventory.files.length, bytes: total };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await preparePublicDemo()));
