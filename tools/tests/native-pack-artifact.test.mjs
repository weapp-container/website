import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { installPackArtifact, resolvePackArtifact, selectPackArtifact } from '../native-pack-artifact.mjs';
import { ROOT, VERSION, RELEASE_TAG, run, selectArtifact } from '../sdk-install.mjs';
import { FONT_FILES } from '../native-font.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');

function fixture(releaseTag) {
  return {
    schemaVersion:1,format:'showcase-miniapp-artifact/1',runtimeVersion:VERSION,profile:'restricted-showcase',repository:'weapp-container/showcase',releaseTag,
    packRoot:'1'.repeat(64),policySha256:'2'.repeat(64),fileName:'showcase-miniapp-fixture.tar.gz',size:1,sha256:'3'.repeat(64),
    files:[{path:'policy.json',size:1,sha256:'4'.repeat(64)},{path:'pack/manifest.json',size:1,sha256:'5'.repeat(64)},...FONT_FILES.map(file=>({...file,path:`fonts/${file.path}`}))],
  };
}
test('native pack installation retains an old exact candidate independently of the new creation default',async()=>{
  const current=JSON.parse(await readFile(resolve(ROOT,'platforms/miniapp-artifact.lock.json'),'utf8'));
  assert.equal(RELEASE_TAG,selectPackArtifact(current).releaseTag);
  for(const releaseTag of [`showcase-v${VERSION}-candidate3`,RELEASE_TAG,`showcase-v${VERSION}-candidate12`]){
    const lock=fixture(releaseTag);
    assert.equal(selectPackArtifact(lock).releaseTag,releaseTag);
  }
});
test('native pack installation rejects floating tags, other versions and repository redirection',()=>{
  for(const releaseTag of ['latest',`showcase-v${VERSION}`,`showcase-v${VERSION}-candidate0`,`showcase-v${VERSION}-candidate9\n`,`showcase-v0.0.0-candidate9`]){
    assert.throws(()=>selectPackArtifact(fixture(releaseTag)),/exact current Showcase candidate/);
  }
  for(const repository of ['other/repo','weapp-container/runtime-artifacts']){
    assert.throws(()=>selectPackArtifact({...fixture(RELEASE_TAG),repository}));
  }
});

function mixedCandidates() {
  const current = fixture(RELEASE_TAG), previous = {...fixture(`showcase-v${VERSION}-candidate3`), packRoot:'6'.repeat(64), policySha256:'7'.repeat(64), fileName:'showcase-miniapp-previous.tar.gz'};
  const sdk = (id,pack,releaseTag) => ({id,component:'ios-sdk',target:'ios',runtimeVersion:VERSION,profile:'restricted-showcase',releaseTag,
    fileName:id.replaceAll('/','-')+'.tar.gz',size:1,sha256:'8'.repeat(64),packRoot:pack.packRoot,policySha256:pack.policySha256,producerReceiptSha256:'9'.repeat(64),
    files:[{path:'showcase-distribution.json',size:1,sha256:'a'.repeat(64)}]});
  const sdkLock = {schemaVersion:1,format:'showcase-sdk-artifacts/1',runtimeVersion:VERSION,profile:'restricted-showcase',repository:'weapp-container/showcase',releaseTag:RELEASE_TAG,
    artifacts:[sdk('ios',current,RELEASE_TAG),sdk('android',previous,previous.releaseTag)]};
  const history = Buffer.from(JSON.stringify(previous));
  const catalog = {schemaVersion:1,format:'showcase-miniapp-history/1',runtimeVersion:VERSION,entries:[{packRoot:previous.packRoot,lockSha256:sha(history)}]};
  const reads = [];
  const readLock = async path => {
    reads.push(path);
    if(path===resolve(ROOT,'platforms/miniapp-artifact.lock.json'))return JSON.stringify(current);
    if(path===resolve(ROOT,'platforms/sdk-artifacts.lock.json'))return JSON.stringify(sdkLock);
    if(path===resolve(ROOT,'platforms/miniapp-artifacts.catalog.json'))return JSON.stringify(catalog);
    assert.equal(path,resolve(ROOT,'platforms/miniapp-history',previous.packRoot+'.lock.json'),'Only the registered fixed historical path may be read');
    return history;
  };
  return {current,previous,sdkLock,history,catalog,reads,readLock};
}
test('mixed SDK candidates select their own exact pack and policy while the default stays current',async()=>{
  const f=mixedCandidates();
  assert.deepEqual(await resolvePackArtifact(undefined,{readLock:f.readLock}),f.current);
  assert.equal(f.reads.length,1,'Default creation/install consumers must not depend on a historical SDK');
  assert.deepEqual(await resolvePackArtifact('ios',{readLock:f.readLock}),f.current);
  assert.deepEqual(await resolvePackArtifact('android',{readLock:f.readLock}),f.previous);
  assert.equal(f.previous.releaseTag,`showcase-v${VERSION}-candidate3`);
});
test('every committed SDK entry resolves a registered compatible pack independently of the current candidate',async()=>{
  const lock=JSON.parse(await readFile(resolve(ROOT,'platforms/sdk-artifacts.lock.json'),'utf8'));
  for(const sdk of lock.artifacts){
    const pack=await resolvePackArtifact(sdk.id);
    assert.equal(pack.packRoot,sdk.packRoot,sdk.id);assert.equal(pack.policySha256,sdk.policySha256,sdk.id);
  }
  const current=JSON.parse(await readFile(resolve(ROOT,'platforms/miniapp-artifact.lock.json'),'utf8'));
  assert.deepEqual(await resolvePackArtifact(),current);
});
test('every native CI matrix target resolves the same reviewed SDK and compatible pack closure',async()=>{
  const matrix=JSON.parse(await run(process.execPath,[resolve(ROOT,'tools/native-ci-matrix.mjs'),'all','all']));
  const sdkLock=JSON.parse(await readFile(resolve(ROOT,'platforms/sdk-artifacts.lock.json'),'utf8'));
  assert.equal(matrix.include.length,13);
  for(const target of matrix.include){
    const sdk=selectArtifact(sdkLock,target.id),pack=await resolvePackArtifact(target.id);
    assert.equal(pack.packRoot,sdk.packRoot,`${target.family}/${target.platform}`);
    assert.equal(pack.policySha256,sdk.policySha256,`${target.family}/${target.platform}`);
    if(target.platform==='windows')assert.equal(target.runner,'windows-2025');
    if(target.platform==='linux')assert.equal(target.runner,'ubuntu-24.04');
  }
});
test('unknown SDK roots, unknown ids and policy mismatches fail before any unregistered path is read',async()=>{
  const unknown=mixedCandidates();unknown.sdkLock.artifacts[1].packRoot='b'.repeat(64);
  await assert.rejects(resolvePackArtifact('android',{readLock:unknown.readLock}),/No reviewed pack artifact/);
  assert.ok(unknown.reads.every(path=>!path.includes('/miniapp-history/')));
  for(const sdkId of ['unknown','../../outside','android;echo-private'])await assert.rejects(resolvePackArtifact(sdkId,{readLock:mixedCandidates().readLock}));
  for(const id of ['ios','android']){
    const f=mixedCandidates();f.sdkLock.artifacts.find(item=>item.id===id).policySha256='c'.repeat(64);
    await assert.rejects(resolvePackArtifact(id,{readLock:f.readLock}),/policy differs/);
  }
});
test('historical lock bytes, paths, repositories, release tags and duplicate catalog roots cannot be substituted',async()=>{
  const altered=mixedCandidates();
  await assert.rejects(resolvePackArtifact('android',{readLock:async path=>{
    const bytes=await altered.readLock(path);return path.includes('/miniapp-history/')?Buffer.concat([bytes,Buffer.from('\n')]):bytes;
  }}),/Historical pack lock SHA-256 mismatch/);
  for(const key of ['lockPath','repository','releaseTag']){
    const f=mixedCandidates();f.catalog.entries[0][key]='unreviewed';
    await assert.rejects(resolvePackArtifact('android',{readLock:f.readLock}),/cannot override/);
  }
  const duplicate=mixedCandidates();duplicate.catalog.entries.push({...duplicate.catalog.entries[0]});
  await assert.rejects(resolvePackArtifact('android',{readLock:duplicate.readLock}),/Duplicate historical/);
  for(const mutation of [{repository:'other/repo'},{releaseTag:'latest'},{packRoot:'d'.repeat(64)}]){
    const f=mixedCandidates(),bytes=Buffer.from(JSON.stringify({...f.previous,...mutation}));f.catalog.entries[0].lockSha256=sha(bytes);
    await assert.rejects(resolvePackArtifact('android',{readLock:async path=>path.includes('/miniapp-history/')?bytes:f.readLock(path)}));
  }
  const injected=mixedCandidates();injected.sdkLock.artifacts[1].repository='other/repo';
  await assert.rejects(resolvePackArtifact('android',{readLock:injected.readLock}),/cannot override/);
});
test('downloads use each selected candidate and altered archive bytes never reach extraction or the destination',async t=>{
  const root=await mkdtemp(join(tmpdir(),'showcase-pack-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const f=mixedCandidates(),downloads=[];
  // Tiny corrupt downloads exercise the archive boundary without shipping the
  // private 17 MB font or relying on network credentials in this regression.
  for(const sdkId of ['ios','android']){
    const expected=sdkId==='ios'?f.current:f.previous;
    await assert.rejects(installPackArtifact({sdkId,destination:join(root,sdkId)},{readLock:f.readLock,runCommand:async(command,args)=>{
      assert.equal(command,'gh');assert.deepEqual(args.slice(0,7),['release','download',expected.releaseTag,'--repo','weapp-container/showcase','--pattern',expected.fileName]);
      downloads.push([sdkId,args[2]]);await writeFile(join(args[args.indexOf('--dir')+1],expected.fileName),'x');
    }}),/Pack archive SHA-256 mismatch/);
  }
  assert.deepEqual(downloads,[['ios',RELEASE_TAG],['android',`showcase-v${VERSION}-candidate3`]]);
  assert.deepEqual(await readdir(root),[],'Failed installs must remove their private work and leave no application pack');
});
test('the CLI exposes no lock-path, repository or release-tag override',async()=>{
  for(const option of ['--manifest','--lock','--repository','--release-tag']){
    await assert.rejects(run(process.execPath,[resolve(ROOT,'tools/native-pack-artifact.mjs'),'--install',option,'unreviewed']),/Unknown\/duplicate\/missing pack artifact option/);
  }
});
