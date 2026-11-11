import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, VERSION, verifyInstallation, sdkHostId } from './sdk-install.mjs';
import { signingEnvironment } from './native-signing.mjs';
import { syncPack } from './native-sync-pack.mjs';
import { stageDelivery, verifyAndroidApk, verifyAndroidRuntime } from './native-delivery.mjs';
import { stageFonts } from './native-font.mjs';
import { stageFlutterSdkDependency } from './flutter-sdk-root.mjs';
async function command(binary, args, cwd, env = {}) {
  const process = spawn(binary, args, { cwd, env: { ...globalThis.process.env, ...env }, stdio: 'inherit' });
  const code = await new Promise((accept, reject) => { process.once('error', reject); process.once('close', accept); });
  assert.equal(code, 0, `${binary} exited ${code}`);
}
export async function buildNative({ platform, flutter = process.env.FLUTTER_BIN || (process.platform === 'win32' ? 'flutter.bat' : 'flutter'), simulator = false }) {
  assert.ok(['android', 'ios', 'macos', 'windows', 'linux'].includes(platform));
  const required = { ios: 'darwin', macos: 'darwin', windows: 'win32', linux: 'linux' };
  assert.ok(!required[platform] || required[platform] === process.platform, `Build ${platform} on its target operating system`);
  assert.ok(!simulator || platform === 'ios', '--simulator applies only to iOS');
  const output = resolve(ROOT, 'artifacts/native', platform); await mkdir(output, { recursive: true });
  const receipt = { schemaVersion: 1, version: VERSION, platform, profile: 'restricted-showcase', status: 'running', signing: platform === 'android' ? 'dedicated-release-key-required' : 'not-verified', startedAt: new Date().toISOString(), execution: 'not-run', commands: [] };
  try {
    const installation = await verifyInstallation(resolve(ROOT, '.runtime/sdk/flutter'), sdkHostId('flutter',platform));
    assert.equal(installation.binding.runtimeVersion, VERSION); assert.equal(installation.binding.profile, receipt.profile);
    assert.ok(installation.binding.target === platform || installation.binding.target === 'all' || installation.binding.target === 'android-ios-macos' && ['android','ios','macos'].includes(platform) || installation.binding.target === 'windows-linux' && ['windows','linux'].includes(platform), 'SDK archive targets another platform');
    const pack = await syncPack(undefined,{family:'flutter'}); assert.equal(installation.binding.packRoot, pack.packRoot, 'SDK compiled allowlist and shared pack differ');
    receipt.sdk = { archiveSha256: installation.archiveSha256, binding: installation.binding }; receipt.packRoot = pack.packRoot;
    const cwd = resolve(ROOT, 'hosts/flutter'), symbols = resolve(ROOT, '.private/symbols/flutter', platform); await mkdir(symbols, { recursive: true });
    receipt.sdkDependency = await stageFlutterSdkDependency({ sdkDirectory: resolve(ROOT, '.runtime/sdk/flutter'), hostDirectory: cwd, installation, platform });
    const fonts = await stageFonts(); receipt.fonts = fonts.files;
    await mkdir(resolve(cwd, 'assets/fonts'), { recursive: true });
    for (const font of fonts.files) await cp(resolve(fonts.directory, font.path), resolve(cwd, 'assets/fonts', font.path));
    const args = simulator ? ['build', 'ios', '--simulator', '--debug'] : ['build', platform === 'android' ? 'apk' : platform, '--release', '--obfuscate', `--split-debug-info=${symbols}`];
    args.push('--no-pub');
    if (platform === 'android') args.push('--target-platform', 'android-arm64,android-x64');
    if (platform === 'ios' && !simulator && !process.env.SHOWCASE_APPLE_TEAM) args.push('--no-codesign');
    const env = platform === 'android' ? await signingEnvironment() : {};
    receipt.commands.push({ command: 'flutter pub get', status: 'running' });
    await command(flutter, ['pub', 'get'], cwd, env); receipt.commands.at(-1).status = 'passed';
    // Give Flutter's generated registrant a package URI before the frontend
    // resolves it. Otherwise the AOT snapshot retains the build machine path.
    // --no-pub keeps the verified package configuration for this compilation.
    const configPath = resolve(cwd, '.dart_tool/package_config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const generatedPackage = 'showcase_generated_registrant';
    const generatedMapping = { name: generatedPackage, rootUri: 'flutter_build/', packageUri: '', languageVersion: '3.0' };
    const existing = config.packages.find(item => item.name === generatedPackage);
    if (existing) assert.deepEqual(existing, generatedMapping, 'Generated compiler package name is already in use');
    else config.packages.push(generatedMapping);
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    receipt.generatedRegistrantUri = `package:${generatedPackage}/dart_plugin_registrant.dart`;
    receipt.commands.push({ command: `flutter ${args.map(value => value.startsWith('--split-debug-info') ? '--split-debug-info=[private]' : value).join(' ')}`, status: 'running' });
    await command(flutter, args, cwd, env); receipt.commands.at(-1).status = 'passed';
    receipt.status = 'built'; receipt.obfuscation = simulator ? 'not-applicable-debug-only' : 'flutter-obfuscate';
    receipt.signing = platform === 'android' ? 'dedicated-release-key; verification-pending' : platform === 'ios' && !process.env.SHOWCASE_APPLE_TEAM ? 'unsigned' : 'not-verified';
    receipt.outputRoot = 'hosts/flutter/build';
    const application = {
      android: 'build/app/outputs/flutter-apk/app-release.apk',
      ios: simulator ? 'build/ios/iphonesimulator/Runner.app' : 'build/ios/iphoneos/Runner.app',
      macos: 'build/macos/Build/Products/Release/container_showcase.app',
      windows: 'build/windows/x64/runner/Release',
      linux: 'build/linux/x64/release/bundle',
    }[platform];
    if (platform === 'android') { receipt.signing = await verifyAndroidApk(resolve(cwd,application)); receipt.nativeRuntime=await verifyAndroidRuntime(resolve(cwd,application),resolve(ROOT,'.runtime/sdk/flutter'),installation); }
    receipt.delivery = await stageDelivery('flutter',platform,resolve(cwd,application));
  } catch (error) { receipt.status = 'failed'; receipt.error = error.message; }
  receipt.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'build.json'), JSON.stringify(receipt, null, 2) + '\n');
  if (receipt.status !== 'built') throw Error(`${receipt.error}; see artifacts/native/${platform}/build.json`);
  return receipt;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), values = {};
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--simulator') { values.simulator = true; continue; }
      const key = { '--platform': 'platform', '--flutter': 'flutter' }[args[index]]; assert.ok(key && args[index + 1]); values[key] = args[++index];
    }
    console.log(JSON.stringify(await buildNative(values)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
