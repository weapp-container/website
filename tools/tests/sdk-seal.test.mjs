import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seal } from '../sdk-seal.mjs';
import { VERSION, RELEASE_TAG, WEBSITE_REPOSITORY, install } from '../sdk-install.mjs';
import { FONT_FILES } from '../native-font.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'showcase-seal-test-'))); t.after(() => rm(root,{recursive:true,force:true}));
  const source=join(root,'delivery'),out=join(root,'archives');await mkdir(source);
  const policy={allowedApis:['showcase.message'],allowedPackRoots:['1'.repeat(64)],schemaVersion:1};
  const policySha256=sha(JSON.stringify(policy));
  // Synthetic marker bytes exercise the sealing boundary only; these are
  // never installed as a real SDK or recorded as native execution evidence.
  const bytes=Buffer.from(`fixture-weapp-container-distribution:restricted-showcase:${policySha256}\0weapp-container-native-font:${FONT_FILES[0].sha256}:${FONT_FILES[1].sha256}\0`);
  await writeFile(join(source,'libweapp_container_sdk.so'),bytes);
  await writeFile(join(source,'NotoSansSC.LICENSE.OFL.txt'),await readFile(new URL('./fixtures/noto-LICENSE.OFL.txt',import.meta.url)));
  const identity={schemaVersion:1,sdkVersion:VERSION,distributionProfile:'restricted-showcase',policySha256,sourceDirty:false,sourceCommit:'a'.repeat(40)};
  const native={...identity,status:'built',profile:'release',platform:'android',features:['restricted-showcase'],nativeFont:{fontSha256:FONT_FILES[0].sha256,fontBytes:FONT_FILES[0].size,licenseSha256:FONT_FILES[1].sha256,licenseBytes:FONT_FILES[1].size,markerVerified:true},artifacts:[{file:'libweapp_container_sdk.so',bytes:bytes.length,sha256:sha(bytes)}]};
  const receiptValue={...identity,status:'passed',native:[native]};
  const receipt=join(root,'receipt.json'),policyPath=join(root,'policy.json'),manifest=join(root,'lock.json');
  await writeFile(receipt,JSON.stringify(receiptValue));await writeFile(policyPath,JSON.stringify(policy));
  await writeFile(manifest,JSON.stringify({schemaVersion:1,format:'showcase-sdk-artifacts/1',runtimeVersion:VERSION,profile:'restricted-showcase',repository:WEBSITE_REPOSITORY,releaseTag:RELEASE_TAG,artifacts:[]}));
  return {root,source,receipt,receiptValue,manifest,out,policy:policyPath,id:'android',component:'android-sdk',target:'android'};
}
test('sealing preserves original producer bytes and binds the exact private policy',async t=>{
  const f=await fixture(t),result=await seal(f),lock=JSON.parse(await readFile(f.manifest,'utf8'));
  assert.equal(lock.artifacts[0].sha256,result.sha256);
  assert.equal(lock.artifacts[0].producerReceiptSha256,sha(await readFile(f.receipt)));
  assert.equal(lock.artifacts[0].releaseTag,RELEASE_TAG);
  const destination=join(f.root,'test-extraction');await install({manifest:f.manifest,id:f.id,offline:f.out,destination});
  assert.deepEqual(await readFile(join(destination,'producer-receipt.json')),await readFile(f.receipt));
});
test('a receipt cannot authorize another binary or another compiled policy',async t=>{
  for(const mode of ['digest','policy','font']) {
    const f=await fixture(t);
    if(mode==='digest') f.receiptValue.native[0].artifacts[0].sha256='f'.repeat(64);
    else if(mode==='policy') await writeFile(join(f.source,'libweapp_container_sdk.so'),'weapp-container-distribution:full:\0');
    else {
      const bytes=Buffer.from(`weapp-container-distribution:restricted-showcase:${f.receiptValue.policySha256}\0`);
      await writeFile(join(f.source,'libweapp_container_sdk.so'),bytes);f.receiptValue.native[0].artifacts[0]={file:'libweapp_container_sdk.so',bytes:bytes.length,sha256:sha(bytes)};
    }
    await writeFile(f.receipt,JSON.stringify(f.receiptValue));
    await assert.rejects(seal(f),/unreviewed native core bytes|missing compiled restricted identity|missing compiled reviewed native font identity/);
    assert.deepEqual(JSON.parse(await readFile(f.manifest,'utf8')).artifacts,[]);
  }
});
test('sealing rejects source leaks and desktop packages without runtime verification',async t=>{
  const leaked=await fixture(t);await writeFile(join(leaked.source,'private.rs'),'private test fixture');
  await assert.rejects(seal(leaked),/Private\/intermediate SDK content/);
  const desktop=await fixture(t);desktop.receiptValue.status='packaged';await writeFile(desktop.receipt,JSON.stringify(desktop.receiptValue));
  await assert.rejects(seal({...desktop,id:'desktop/macos',component:'desktop-sdk',target:'macos'}),/verification receipt/);
});
test('compiled fonts cannot be distributed without their exact OFL license',async t=>{
  const f=await fixture(t);await rm(join(f.source,'NotoSansSC.LICENSE.OFL.txt'));
  await assert.rejects(seal(f),/exact license/);
});
test('SDK native projections rely on the original exact binary marker and license',async t=>{
  const f=await fixture(t);delete f.receiptValue.native[0].nativeFont;await writeFile(f.receipt,JSON.stringify(f.receiptValue));
  assert.equal((await seal(f)).nativeCoreSlices,1);
});
test('Windows executable policy lives in the DLL while its import interface keeps the original digest',async t=>{
  for (const mode of ['valid', 'tampered', 'omitted', 'unlisted']) {
    const f=await fixture(t),bytes=await readFile(join(f.source,'libweapp_container_sdk.so'));
    await rm(join(f.source,'libweapp_container_sdk.so'));await writeFile(join(f.source,'weapp_container_sdk.dll'),bytes);
    const imported=Buffer.from('synthetic COFF import interface without executable policy bytes');
    await writeFile(join(f.source,'weapp_container_sdk.dll.lib'),imported);
    const native=f.receiptValue.native[0];native.platform='windows';native.artifacts=[{file:'weapp_container_sdk.dll',bytes:bytes.length,sha256:sha(bytes)},{file:'weapp_container_sdk.dll.lib',bytes:imported.length,sha256:sha(imported)}];
    f.receiptValue.status='verified';f.id='desktop/windows';f.component='desktop-sdk';f.target='windows';
    if(mode==='tampered')await writeFile(join(f.source,'weapp_container_sdk.dll.lib'),'altered import interface');
    if(mode==='omitted')await rm(join(f.source,'weapp_container_sdk.dll.lib'));
    if(mode==='unlisted')native.artifacts.pop();
    await writeFile(f.receipt,JSON.stringify(f.receiptValue));
    if(mode==='valid') {const result=await seal(f);assert.equal(result.nativeCoreSlices,1);assert.equal(result.nativeImportLibraries,1);}
    else await assert.rejects(seal(f),/unreviewed native import library|omits a source native import library|omits its native import interface/);
  }
});
test('a replacement compares the current digest and keeps the previous published archive immutable',async t=>{
  const f=await fixture(t),original=await seal(f),originalBytes=await readFile(original.archive);
  f.receiptValue.sourceCommit='b'.repeat(40);await writeFile(f.receipt,JSON.stringify(f.receiptValue));
  await assert.rejects(seal({...f,replaceSha256:'f'.repeat(64)}),/expected replacement digest/);
  assert.equal(JSON.parse(await readFile(f.manifest)).artifacts[0].sha256,original.sha256);
  const replacement=await seal({...f,replaceSha256:original.sha256});
  assert.notEqual(replacement.archive,original.archive);assert.notEqual(replacement.sha256,original.sha256);
  assert.deepEqual(await readFile(original.archive),originalBytes);
  const lock=JSON.parse(await readFile(f.manifest));assert.equal(lock.artifacts.length,1);assert.equal(lock.artifacts[0].sha256,replacement.sha256);
});
test('a new compiled pack and policy can replace an exact old candidate without rewriting its archive',async t=>{
  const f=await fixture(t),original=await seal(f),originalBytes=await readFile(original.archive);
  const oldTag=`showcase-v${VERSION}-candidate3`,oldLock=JSON.parse(await readFile(f.manifest));
  oldLock.releaseTag=oldTag;oldLock.artifacts[0].releaseTag=oldTag;await writeFile(f.manifest,JSON.stringify(oldLock));
  const policy={allowedApis:['showcase.message'],allowedPackRoots:['4'.repeat(64)],schemaVersion:1},policySha256=sha(JSON.stringify(policy));
  const bytes=Buffer.from(`fixture-weapp-container-distribution:restricted-showcase:${policySha256}\0weapp-container-native-font:${FONT_FILES[0].sha256}:${FONT_FILES[1].sha256}\0`);
  f.receiptValue.sourceCommit='b'.repeat(40);f.receiptValue.policySha256=policySha256;
  f.receiptValue.native[0].policySha256=policySha256;f.receiptValue.native[0].artifacts[0]={file:'libweapp_container_sdk.so',bytes:bytes.length,sha256:sha(bytes)};
  await writeFile(join(f.source,'libweapp_container_sdk.so'),bytes);await writeFile(f.receipt,JSON.stringify(f.receiptValue));await writeFile(f.policy,JSON.stringify(policy));
  await assert.rejects(seal(f),/exact --replace-sha256/);
  const replacement=await seal({...f,replaceSha256:original.sha256});
  assert.equal(replacement.packRoot,policy.allowedPackRoots[0]);assert.equal(replacement.policySha256,policySha256);
  assert.ok(replacement.archive.endsWith(`-${replacement.packRoot.slice(0,12)}-${sha(await readFile(f.receipt)).slice(0,12)}.tar.gz`));
  assert.deepEqual(await readFile(original.archive),originalBytes);
  const lock=JSON.parse(await readFile(f.manifest));assert.equal(lock.releaseTag,oldTag);assert.equal(lock.artifacts[0].releaseTag,RELEASE_TAG);
  await install({manifest:f.manifest,id:f.id,offline:f.out,destination:join(f.root,'updated-installation')});
});
test('replacement keeps the SDK component and target boundary even with an exact old digest',async t=>{
  for(const changed of [{component:'ios-sdk'},{target:'ios'}]){
    const f=await fixture(t),original=await seal(f),originalBytes=await readFile(original.archive);
    f.receiptValue.sourceCommit='b'.repeat(40);await writeFile(f.receipt,JSON.stringify(f.receiptValue));
    await assert.rejects(seal({...f,...changed,replaceSha256:original.sha256}),/replacement changes its (component|target) boundary/);
    assert.equal(JSON.parse(await readFile(f.manifest)).artifacts[0].sha256,original.sha256);
    assert.deepEqual(await readFile(original.archive),originalBytes);
  }
});
test('sealing refuses release aliases and repository overrides before publishing an archive',async t=>{
  for(const changed of [{releaseTag:'latest'},{repository:'other/repo'}]){
    const f=await fixture(t),lock=JSON.parse(await readFile(f.manifest));await writeFile(f.manifest,JSON.stringify({...lock,...changed}));
    await assert.rejects(seal(f),/exact current Showcase candidate|reviewed private artifact repository/);
    assert.deepEqual(JSON.parse(await readFile(f.manifest)).artifacts,[]);
  }
});
