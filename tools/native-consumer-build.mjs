import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, VERSION, run, verifyInstallation } from './sdk-install.mjs';
import { syncPack } from './native-sync-pack.mjs';
import { signingEnvironment } from './native-signing.mjs';
import { iosProject } from './native-ios-project.mjs';
import { stageDelivery, verifyAndroidApk, verifyAndroidRuntime } from './native-delivery.mjs';
import { stageFonts } from './native-font.mjs';

const args = process.argv.slice(2), platform = args[args.indexOf('--platform') + 1];
assert.ok(args.includes('--platform') && ['android','ios','macos','windows','linux'].includes(platform));
const device = args.includes('--device');
assert.ok(!device || platform === 'ios', '--device applies only to iOS');
const family = ['macos','windows','linux'].includes(platform) ? `desktop/${platform}` : platform;
const output = resolve(ROOT, 'artifacts/consumers', platform); await mkdir(output, { recursive: true });
const receipt = { schemaVersion: 1, version: VERSION, platform, profile: 'restricted-showcase', build: 'running', execution: 'not-run', startedAt: new Date().toISOString() };
try {
  const sdk = resolve(ROOT, '.runtime/sdk', family), installation = await verifyInstallation(sdk, family);
  assert.equal(installation.binding.runtimeVersion, VERSION); assert.equal(installation.binding.profile, receipt.profile);
  const pack = await syncPack(undefined,{family:'native',platform}); assert.equal(installation.binding.packRoot, pack.packRoot);
  receipt.sdkArchiveSha256 = installation.archiveSha256; receipt.packRoot = pack.packRoot;
  if (platform === 'android') {
    const gradle = process.env.GRADLE || resolve(ROOT, 'hosts/native-android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
    await run(gradle, [':app:assembleRelease', '--no-daemon'], { cwd: resolve(ROOT, 'hosts/native-android'), env: { ...process.env, ...await signingEnvironment() } });
    const apk = resolve(ROOT,'hosts/native-android/app/build/outputs/apk/release/app-release.apk');
    receipt.signing = await verifyAndroidApk(apk); receipt.nativeRuntime=await verifyAndroidRuntime(apk,sdk,installation); receipt.delivery = await stageDelivery('native',platform,apk);
  } else if (platform === 'ios') {
    assert.equal(process.platform, 'darwin'); const project = await iosProject();
    const sdk = device ? 'iphoneos' : 'iphonesimulator', destination = device ? 'generic/platform=iOS' : 'generic/platform=iOS Simulator';
    const derived = resolve(output, device ? 'derived-device' : 'derived');
    receipt.command = ['xcodebuild', '-project', project, '-scheme', 'Showcase', '-configuration', 'Release', '-sdk', sdk, '-destination', destination, '-derivedDataPath', derived, 'build', 'CODE_SIGNING_ALLOWED=NO'];
    await run(receipt.command[0], receipt.command.slice(1), { cwd: ROOT });
    receipt.signing = device ? 'unsigned-device' : 'unsigned-simulator'; receipt.delivery = await stageDelivery('native',platform,resolve(derived,`Build/Products/Release-${sdk}/Showcase.app`));
  } else {
    const expected = {macos:'darwin',windows:'win32',linux:'linux'}[platform]; assert.equal(process.platform, expected, 'Use the target OS runner');
    const fonts = await stageFonts(); receipt.fonts = fonts.files;
    await run('cmake', ['-S', resolve(ROOT,'hosts/native-desktop'), '-B', resolve(output,'build'), `-DCMAKE_PREFIX_PATH=${sdk}`, `-DSHOWCASE_PACK_DIR=${resolve(ROOT,'artifacts/miniapp/pack')}`, `-DSHOWCASE_FONT_DIR=${fonts.directory}`, '-DCMAKE_BUILD_TYPE=Release']);
    await run('cmake', ['--build', resolve(output,'build'), '--config','Release','--parallel','4']);
    const app = platform === 'macos' ? resolve(output,'build/container_showcase.app') : platform === 'windows' ? resolve(output,'build/Release') : resolve(output,'build');
    if (platform === 'linux') {
      const { cp } = await import('node:fs/promises');
      const bundle = resolve(output,'bundle'); await mkdir(bundle,{recursive:true});
      for (const file of ['container_showcase','portable-pack','fonts']) await cp(resolve(app,file),resolve(bundle,file),{recursive:true});
      receipt.delivery = await stageDelivery('native',platform,bundle);
    } else receipt.delivery = await stageDelivery('native',platform,app);
  }
  receipt.build = 'passed';
} catch (error) { receipt.build = 'failed'; receipt.error = error.message; process.exitCode = 1; }
receipt.finishedAt = new Date().toISOString(); await writeFile(resolve(output,'build.json'), JSON.stringify(receipt,null,2)+'\n'); console.log(JSON.stringify(receipt));
