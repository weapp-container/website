import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, VERSION } from './sdk-install.mjs';
import { nativeCommerceInteraction } from './native-commerce-interaction.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const delay = milliseconds => new Promise(accept => setTimeout(accept, milliseconds));
const execute = async (command, args, options = {}) => (await promisify(execFile)(command, args, { timeout: 15000, maxBuffer: 1024 ** 2, ...options })).stdout;
const powershell = async (script, { timeout = 15000, diagnostics } = {}) => {
  try { return await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout }); }
  catch (error) {
    const detail = { code: error.code ?? null, killed: error.killed ?? false, signal: error.signal ?? null, timeoutMs: timeout, stdout: String(error.stdout ?? '').slice(-8192), stderr: String(error.stderr ?? '').slice(-8192) };
    if (diagnostics) await writeFile(diagnostics, JSON.stringify(detail, null, 2) + '\n');
    throw Object.assign(new Error(`Windows window inspection failed: ${detail.killed ? 'process exceeded its bounded deadline' : detail.stderr.trim().slice(-1000) || String(detail.code)}`), { diagnostics: detail });
  }
};
const quotePowerShell = text => `'${String(text).replaceAll("'", "''")}'`;

export function assertGuestReport(value, { family, pid, closed = false }) {
  assert.equal(value.schemaVersion, 1); assert.equal(value.family, family); assert.equal(value.pid, pid);
  assert.ok(!value.error, `Application reported: ${value.error}`);
  assert.equal(value.guestReady, true);
  assert.ok(value.guestStateChanged === undefined || typeof value.guestStateChanged === 'boolean');
  if (closed) { assert.equal(value.storageFlushed, true); assert.equal(value.closed, true); }
  return { ...value, guestStateChanged: value.guestStateChanged === true };
}

async function captureWindow({ platform, pid, output }) {
  if (platform === 'linux') {
    const windows = (await execute('xdotool', ['search', '--onlyvisible', '--pid', String(pid)])).trim().split(/\s+/).filter(Boolean), candidates = [];
    for (const id of windows) {
      if (!/^\d+$/.test(id)) continue;
      const geometry = await execute('xdotool', ['getwindowgeometry', '--shell', id]);
      const width = Number(geometry.match(/^WIDTH=(\d+)$/m)?.[1]), height = Number(geometry.match(/^HEIGHT=(\d+)$/m)?.[1]);
      if (width >= 300 && height >= 400) candidates.push({ id, width, height });
    }
    assert.equal(candidates.length, 1, 'Require exactly one visible application window belonging to the launched PID');
    const window = candidates[0];
    await execute('import', ['-window', window.id, output]);
    const colors = Number((await execute('convert', [output, '-gravity', 'center', '-crop', '80%x80%+0+0', '+repage', '-format', '%k', 'info:'])).trim());
    assert.ok(colors >= 16, 'Application content capture is blank or has insufficient rendered detail');
    return { pid, windowId: window.id, width: window.width, height: window.height, contentColors: colors, method: 'X11 exact PID window capture' };
  }
  const result = await powershell(`
$timer=[System.Diagnostics.Stopwatch]::StartNew()
$stages=New-Object 'System.Collections.Generic.List[string]'
function Mark([string]$stage){$value=$stage+' '+$timer.ElapsedMilliseconds+'ms';$stages.Add($value);[Console]::Error.WriteLine($value)}
Mark 'capture-stage=load-drawing'
Add-Type -AssemblyName System.Drawing
Mark 'capture-stage=compile-window-api'
Add-Type @'
using System; using System.Runtime.InteropServices;
public class ShowcaseWindow {
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd,out RECT rect);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
 [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd,IntPtr hdc,uint flags);
}
'@
Mark 'capture-stage=resolve-owned-window'
$app=Get-Process -Id ${pid} -ErrorAction Stop
$window=$app.MainWindowHandle
if($window -eq [IntPtr]::Zero){throw 'Launched application has no main window'}
[uint32]$owner=0;[void][ShowcaseWindow]::GetWindowThreadProcessId($window,[ref]$owner)
if($owner -ne ${pid}){throw 'Window owner differs from launched PID'}
$bounds=New-Object ShowcaseWindow+RECT
if(-not [ShowcaseWindow]::GetWindowRect($window,[ref]$bounds)){throw 'Window bounds unavailable'}
$width=$bounds.Right-$bounds.Left;$height=$bounds.Bottom-$bounds.Top
if($width -lt 300 -or $height -lt 400){throw 'Application window is unexpectedly small'}
$bitmap=New-Object System.Drawing.Bitmap($width,$height)
$graphics=[System.Drawing.Graphics]::FromImage($bitmap)
try {
 Mark 'capture-stage=print-window'
 $dc=$graphics.GetHdc()
 try { $ok=[ShowcaseWindow]::PrintWindow($window,$dc,2) } finally { $graphics.ReleaseHdc($dc) }
 if(-not $ok){throw 'Exact application window capture failed'}
 Mark 'capture-stage=inspect-pixels'
 $colors=New-Object 'System.Collections.Generic.HashSet[int]'
 for($y=[int]($height*0.1);$y -lt [int]($height*0.9);$y+=5){for($x=[int]($width*0.1);$x -lt [int]($width*0.9);$x+=5){[void]$colors.Add($bitmap.GetPixel($x,$y).ToArgb())}}
 if($colors.Count -lt 16){throw 'Application content capture is blank or has insufficient rendered detail'}
 $bitmap.Save(${quotePowerShell(output)},[System.Drawing.Imaging.ImageFormat]::Png)
 Mark 'capture-stage=saved'
} finally {$graphics.Dispose();$bitmap.Dispose()}
@{pid=${pid};windowId=$window.ToInt64().ToString();width=$width;height=$height;contentColors=$colors.Count;method='Windows exact PID PrintWindow';stages=$stages.ToArray()}|ConvertTo-Json -Compress
`, { timeout: 60000, diagnostics: resolve(dirname(output), 'capture-diagnostics.json') });
  return JSON.parse(result);
}

async function closeWindowsNative(pid) {
  await powershell(`$app=Get-Process -Id ${pid} -ErrorAction Stop; if(-not $app.CloseMainWindow()){throw 'Owned native window refused WM_CLOSE'}`);
}

export async function runtimeCheck({ family, platform, root = ROOT, timeoutMs = 120000, interaction, interact = nativeCommerceInteraction, capture = captureWindow, launch = (executable, options) => spawn(executable, [], options), windowsClose = closeWindowsNative, enforceOS = true }) {
  assert.ok(['native', 'flutter'].includes(family)); assert.ok(['windows', 'linux'].includes(platform));
  assert.ok(interaction === undefined || interaction === 'commerce');
  if (enforceOS) assert.equal(process.platform, platform === 'windows' ? 'win32' : 'linux', 'Run the application on its target OS');
  const buildPath = resolve(root, 'artifacts', family === 'native' ? 'consumers' : 'native', platform, 'build.json');
  const buildBytes = await readFile(buildPath), build = JSON.parse(buildBytes);
  assert.equal(build.version, VERSION); assert.equal(build.profile, 'restricted-showcase'); assert.equal(build.platform, platform);
  assert.ok(build.build === 'passed' || build.status === 'built', 'A successful original application build is required');
  const delivery = resolve(root, 'artifacts/delivery', family, platform); assert.equal(resolve(build.delivery.path), delivery);
  const inventoryBytes = await readFile(resolve(delivery, 'files.json')), inventory = JSON.parse(inventoryBytes);
  assert.equal(inventory.length, build.delivery.files);
  const deliveryRoot = await realpath(delivery);
  const seen = new Set();
  for (const file of inventory) {
    assert.ok(typeof file.path === 'string' && !isAbsolute(file.path) && !file.path.split(/[\\/]/).some(part => part === '..') && !seen.has(file.path)); seen.add(file.path);
    const path = await realpath(resolve(delivery, file.path)); assert.ok(path.startsWith(deliveryRoot + sep)); assert.ok((await lstat(path)).isFile());
    const bytes = await readFile(path); assert.equal(bytes.length, file.size); assert.equal(sha(bytes), file.sha256, 'Delivered application bytes changed after its build receipt');
  }
  const expectedName = family === 'native' ? 'container_showcase' : 'container_showcase';
  const executables = inventory.filter(file => basename(file.path) === expectedName + (platform === 'windows' ? '.exe' : ''));
  assert.equal(executables.length, 1, 'Delivery must identify exactly one application executable');
  const selected = executables[0]; assert.ok(!isAbsolute(selected.path) && !selected.path.split(/[\\/]/).some(part => part === '..'));
  const executable = resolve(delivery, selected.path), canonical = await realpath(executable);
  assert.ok(canonical.startsWith(deliveryRoot + sep)); assert.ok((await lstat(executable)).isFile());
  const executableBytes = await readFile(executable); assert.equal(executableBytes.length, selected.size); assert.equal(sha(executableBytes), selected.sha256);
  const output = resolve(root, 'artifacts/native-runtime', family, platform); await mkdir(output, { recursive: true });
  const run = resolve(output, `run-${randomUUID()}`); await mkdir(run);
  const guestReport = resolve(run, 'guest.json'), closeFile = resolve(run, 'close.request'), support = resolve(run, 'support'); await mkdir(support);
  const stdout = [], stderr = [], started = Date.now();
  const child = launch(executable, { cwd: dirname(executable), env: { ...process.env, SHOWCASE_RUNTIME_REPORT: guestReport, SHOWCASE_RUNTIME_CLOSE_FILE: closeFile,
    SHOWCASE_RUNTIME_SUPPORT: support, XDG_DATA_HOME: resolve(support, 'data'), XDG_CONFIG_HOME: resolve(support, 'config'), LOCALAPPDATA: support, APPDATA: support }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.on('data', data => { if (stdout.join('').length < 1024 ** 2) stdout.push(String(data)); });
  child.stderr?.on('data', data => { if (stderr.join('').length < 1024 ** 2) stderr.push(String(data)); });
  let exit, spawnError; const ended = new Promise(accept => { child.once('error', error => { spawnError = error; accept(); }); child.once('exit', (code, signal) => { exit = { code, signal }; accept(); }); });
  const report = { schemaVersion: 1, family, platform, status: 'running', startedAt: new Date(started).toISOString(), applicationPid: child.pid,
    buildReceiptSha256: sha(buildBytes), deliveryInventorySha256: sha(inventoryBytes), executable: selected, packRoot: build.packRoot,
    scope: `Real target application window, guest readiness handshake, storage flush, graceful close and owned process exit. ${interaction ? 'The separate interaction result verifies actual pointer input and persisted business state.' : 'Business interaction and device behavior are outside this check.'}` };
  const readGuest = async () => { try { return JSON.parse(await readFile(guestReport, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
  try {
    assert.ok(Number.isSafeInteger(child.pid));
    while (true) {
      if (spawnError) throw spawnError;
      assert.ok(!exit, 'Application exited before guest readiness');
      const guest = await readGuest();
      if (guest?.error) throw Error(`Application reported: ${guest.error}`);
      if (guest?.guestReady) { report.ready = assertGuestReport(guest, { family, pid: child.pid }); break; }
      assert.ok(Date.now() - started < timeoutMs, 'Guest bridge readiness timed out'); await delay(100);
    }
    await delay(1000);
    const screenshot = resolve(output, 'window.png'); report.window = await capture({ platform, pid: child.pid, output: screenshot });
    const image = await readFile(screenshot); assert.ok(image.length > 4096 && image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'Window capture must be a nonempty PNG');
    report.screenshot = { file: 'window.png', size: image.length, sha256: sha(image) };
    if (interaction) report.interaction = await interact({ family, platform, pid: child.pid, window: report.window, output, support, capture, readGuest });
    await writeFile(closeFile, 'close\n', { flag: 'wx' });
    if (platform === 'windows' && family === 'native') await windowsClose(child.pid);
    const closeStarted = Date.now();
    while (!exit && !spawnError) { assert.ok(Date.now() - closeStarted < 30000, 'Graceful application close timed out'); await delay(100); }
    if (spawnError) throw spawnError;
    assert.equal(exit.code, 0); assert.equal(exit.signal, null);
    report.closed = assertGuestReport(await readGuest(), { family, pid: child.pid, closed: true });
    report.businessStateChangeObserved = report.closed.guestStateChanged;
    report.exit = exit; report.status = 'passed'; report.cleanup = 'owned application exited gracefully';
  } catch (error) { report.status = 'failed'; report.error = error.message; if (error.diagnostics) report.captureDiagnostics = error.diagnostics; }
  finally {
    if (!exit && !spawnError) {
      // Only the child launched above is eligible for timeout cleanup.
      await writeFile(closeFile, 'close\n').catch(() => {});
      if (platform === 'windows' && family === 'native') await windowsClose(child.pid).catch(error => { report.closeRequestError = error.message; });
      await Promise.race([ended, delay(5000)]);
      if (!exit) { child.kill('SIGTERM'); await Promise.race([ended, delay(5000)]); report.cleanup = 'owned application required SIGTERM'; }
      if (!exit) { child.kill('SIGKILL'); await Promise.race([ended, delay(5000)]); report.cleanup = exit ? 'owned application required SIGKILL' : 'owned application cleanup failed'; }
    }
    report.exit ??= exit ?? null; report.finishedAt = new Date().toISOString();
    if (exit) report.cleanup ??= exit.code === 0 ? 'owned application exited after close request' : 'owned application exited with failure';
    await writeFile(resolve(output, 'stdout.log'), stdout.join('')); await writeFile(resolve(output, 'stderr.log'), stderr.join(''));
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  if (report.status !== 'passed') throw Error(`${report.error}; see ${resolve(output, 'report.json')}`);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let index = 0; index < args.length; index += 2) { const key = { '--family': 'family', '--platform': 'platform', '--interaction': 'interaction' }[args[index]]; assert.ok(key && args[index + 1] && !options[key]); options[key] = args[index + 1]; }
    console.log(JSON.stringify(await runtimeCheck(options), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
