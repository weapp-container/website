import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, VERSION, run, verifyInstallation, sdkHostId } from './sdk-install.mjs';
import { syncPack } from './native-sync-pack.mjs';
import { signingEnvironment } from './native-signing.mjs';
import { stageDelivery, verifyAndroidApk, verifyAndroidRuntime } from './native-delivery.mjs';
const args = process.argv.slice(2), platform = args[args.indexOf('--platform') + 1];
assert.ok(args.length === 2 && args[0] === '--platform' && ['android','ios'].includes(platform), 'Choose --platform android|ios');
const output = resolve(ROOT,'artifacts/react-native',platform); await mkdir(output,{recursive:true});
const receipt = {schemaVersion:1,version:VERSION,platform,profile:'restricted-showcase',build:'running',execution:'not-run',startedAt:new Date().toISOString()};
try {
  const installation = await verifyInstallation(resolve(ROOT,'.runtime/sdk/react-native'),sdkHostId('react-native',platform));
  assert.equal(installation.binding.target,'android-ios');
  const pack = await syncPack(undefined,{family:'react-native',platform}); assert.equal(pack.packRoot,installation.binding.packRoot);
  receipt.packRoot = pack.packRoot; receipt.sdkArchiveSha256 = installation.archiveSha256;
  const cwd = resolve(ROOT,'hosts/react-native');
  let locked = true; try {await stat(resolve(cwd,'package-lock.json'));} catch (error) {if(error.code !== 'ENOENT') throw error; locked=false;}
  // npm's default file: symlink lets Gradle write generated output into the
  // verified SDK installation. Pack a private consumer copy instead.
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm',[locked?'ci':'install','--install-links','--ignore-scripts','--no-audit','--no-fund'],{cwd});
  await run(process.platform === 'win32' ? 'npx.cmd' : 'npx',['tsc','--noEmit'],{cwd});
  if (platform === 'android') {
    const gradle = resolve(cwd,'android',process.platform === 'win32' ? 'gradlew.bat':'gradlew');
    await run(gradle,[':app:assembleRelease','--no-daemon'],{cwd:resolve(cwd,'android'),env:{...process.env,...await signingEnvironment()}});
    const apk = resolve(cwd,'android/app/build/outputs/apk/release/app-release.apk');
    receipt.signing = await verifyAndroidApk(apk); receipt.nativeRuntime=await verifyAndroidRuntime(apk,resolve(ROOT,'.runtime/sdk/react-native'),installation); receipt.delivery = await stageDelivery('react-native',platform,apk);
  } else {
    assert.equal(process.platform,'darwin','Use a macOS runner for iOS');
    await run('bundle',['install'],{cwd});
    await run('bundle',['exec','pod','install'],{cwd:resolve(cwd,'ios')});
    await run('xcodebuild',['-workspace',resolve(cwd,'ios/HelloWorld.xcworkspace'),'-scheme','HelloWorld','-configuration','Release','-sdk','iphonesimulator','-destination','generic/platform=iOS Simulator','-derivedDataPath',resolve(output,'derived'),'build','CODE_SIGNING_ALLOWED=NO'],{cwd});
    receipt.signing = 'unsigned-simulator'; receipt.delivery = await stageDelivery('react-native',platform,resolve(output,'derived/Build/Products/Release-iphonesimulator/HelloWorld.app'));
  }
  receipt.build = 'passed';
} catch(error) {receipt.build='failed';receipt.error=error.message;process.exitCode=1;}
receipt.finishedAt=new Date().toISOString();await writeFile(resolve(output,'build.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
