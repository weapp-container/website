import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { runtimeCheck, assertGuestReport } from '../native-runtime-check.mjs';
import { VERSION } from '../sdk-install.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(t, { error = false } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'showcase-runtime-check-')); t.after(() => rm(root, { recursive: true, force: true }));
  const family = 'native', platform = 'linux', delivery = resolve(root, 'artifacts/delivery/native/linux');
  await mkdir(resolve(delivery, 'bundle'), { recursive: true });
  const bytes = Buffer.from('inert application inventory fixture'), executable = resolve(delivery, 'bundle/container_showcase');
  await writeFile(executable, bytes);
  const inventory = [{ path: 'bundle/container_showcase', size: bytes.length, sha256: digest(bytes) }];
  await writeFile(resolve(delivery, 'files.json'), JSON.stringify(inventory));
  const build = resolve(root, 'artifacts/consumers/linux'); await mkdir(build, { recursive: true });
  await writeFile(resolve(build, 'build.json'), JSON.stringify({ version: VERSION, profile: 'restricted-showcase', platform, build: 'passed', packRoot: 'a'.repeat(64), delivery: { path: delivery, files: 1 } }));
  const childScript = resolve(root, 'fake-application.mjs');
  await writeFile(childScript, `import{writeFileSync,existsSync,mkdirSync}from'node:fs';import{dirname}from'node:path';
const path=process.env.SHOWCASE_RUNTIME_REPORT;mkdirSync(dirname(path),{recursive:true});
const state={schemaVersion:1,family:'native',pid:process.pid,guestReady:true,${error ? "error:'fixture guest failure'," : ''}};
const save=()=>writeFileSync(path,JSON.stringify(state));save();
setInterval(()=>{if(existsSync(process.env.SHOWCASE_RUNTIME_CLOSE_FILE)){state.closed=true;state.storageFlushed=true;save();process.exit(0)}},20);
`);
  let owned;
  const options = { root, family, platform, enforceOS: false, timeoutMs: 5000,
    launch: (_path, options) => (owned = spawn(process.execPath, [childScript], options)),
    capture: async ({ pid, output }) => { await writeFile(output, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), Buffer.alloc(5000)])); return { pid, windowId: 'inert-test-window', method: 'injected lifecycle test fixture; no real window claim' }; } };
  return { options, root, executable, owned: () => owned };
}

test('owned child readiness, screenshot receipt and explicit flush/close exit form one proof', async t => {
  const f = await fixture(t), report = await runtimeCheck(f.options);
  assert.equal(report.status, 'passed'); assert.equal(report.exit.code, 0); assert.equal(report.closed.closed, true);
  assert.equal(report.applicationPid, f.owned().pid); assert.equal(f.owned().exitCode, 0);
  assert.equal(report.screenshot.size, 5008); assert.match(report.buildReceiptSha256, /^[a-f0-9]{64}$/);
  assert.equal(report.businessStateChangeObserved, false, 'Readiness must not fabricate a business change');
  assert.match(report.scope, /Business interaction.*outside this check/);
});

test('guest error fails verification while still closing only its owned child', async t => {
  const f = await fixture(t, { error: true });
  await assert.rejects(runtimeCheck(f.options), /fixture guest failure/);
  assert.equal(f.owned().exitCode, 0);
  const report = JSON.parse(await readFile(resolve(f.root, 'artifacts/native-runtime/native/linux/report.json'), 'utf8'));
  assert.equal(report.status, 'failed'); assert.equal(report.exit.code, 0);
});

test('modified delivery cannot launch and another process cannot supply guest proof', async t => {
  const f = await fixture(t); await writeFile(f.executable, 'tampered application');
  await assert.rejects(runtimeCheck(f.options)); assert.equal(f.owned(), undefined);
  const report = { schemaVersion: 1, family: 'native', pid: 10, guestReady: true, guestStateChanged: true, storageFlushed: true, closed: true };
  assert.throws(() => assertGuestReport(report, { family: 'native', pid: 11 }));
  assert.throws(() => assertGuestReport({ ...report, storageFlushed: false }, { family: 'native', pid: 10, closed: true }));
  assert.throws(() => assertGuestReport({ ...report, error: 'error' }, { family: 'native', pid: 10 }));
});
