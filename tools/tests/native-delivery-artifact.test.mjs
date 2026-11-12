import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { uploadApplication } from '../native-delivery-artifact.mjs';
import { RELEASE_TAG, VERSION } from '../sdk-install.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

async function fixture(t,releaseTag) {
  const root=await mkdtemp(join(tmpdir(),'showcase-application-release-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const archive=join(root,'showcase-fixture.tar.gz'),bytes=Buffer.from('synthetic application upload boundary fixture');
  await writeFile(archive,bytes);
  const notices=Buffer.from('synthetic reviewed notices'),noticePath=join(root,'showcase-fixture.notices.tar.gz');await writeFile(noticePath,notices);
  const descriptor={schemaVersion:1,kind:'showcase-application/1',runtimeVersion:VERSION,profile:'restricted-showcase',repository:'weapp-container/website',releaseTag,fileName:basename(archive),size:bytes.length,sha256:sha(bytes),notices:{fileName:basename(noticePath),size:notices.length,sha256:sha(notices)}};
  await writeFile(`${archive}.json`,JSON.stringify(descriptor));
  const calls=[],assets=[];
  const runCommand=async(command,args)=>{
    assert.equal(command,'gh');calls.push(args);
    if(args[0]==='repo'){
      assert.deepEqual(args,['repo','view',descriptor.repository,'--json','isPrivate','--jq','.isPrivate']);return 'true';
    }
    assert.equal(args[0],'release');assert.equal(args[2],releaseTag);assert.equal(args[args.indexOf('--repo')+1],descriptor.repository);
    if(args[1]==='view')return JSON.stringify({assets});
    assert.equal(args[1],'upload');
    for(const path of args.slice(3,args.indexOf('--repo'))){const bytes=await readFile(path);assets.push({name:basename(path),state:'uploaded',size:bytes.length,digest:`sha256:${sha(bytes)}`});}
    return '';
  };
  return {archive,descriptor,calls,assets,runCommand};
}
for(const releaseTag of [`showcase-v${VERSION}-candidate19`,RELEASE_TAG]){
  test(`application sidecars upload only to their exact ${releaseTag} release`,async t=>{
    const f=await fixture(t,releaseTag);
    const result=await uploadApplication(f.archive,{runCommand:f.runCommand});
    assert.equal(result.releaseTag,releaseTag);assert.equal(result.assets.length,3);
    assert.equal(JSON.parse(await readFile(`${f.archive}.upload.json`,'utf8')).releaseTag,releaseTag);
    await uploadApplication(f.archive,{runCommand:f.runCommand});
    assert.equal(f.calls.filter(args=>args[0]==='release'&&args[1]==='upload').length,1,'Existing exact assets must remain immutable');
  });
}
test('application sidecars reject release aliases and foreign repositories before any upload',async t=>{
  for(const changed of [{releaseTag:'latest'},{releaseTag:`showcase-v${VERSION}-candidate9\n`},{releaseTag:`showcase-v${VERSION}-candidate3`},{repository:'other/repo'},{repository:'weapp-container/runtime-artifacts'}]){
    const f=await fixture(t,RELEASE_TAG);await writeFile(`${f.archive}.json`,JSON.stringify({...f.descriptor,...changed}));
    await assert.rejects(uploadApplication(f.archive,{runCommand:f.runCommand}));assert.equal(f.calls.length,0);
  }
});
test('a conflicting asset in the original release cannot be replaced or redirected to the new candidate',async t=>{
  const f=await fixture(t,`showcase-v${VERSION}-candidate19`);
  f.assets.push({name:basename(f.archive),state:'uploaded',size:f.descriptor.size,digest:`sha256:${'f'.repeat(64)}`});
  await assert.rejects(uploadApplication(f.archive,{runCommand:f.runCommand}),/Existing immutable application asset differs/);
  assert.equal(f.calls.some(args=>args[1]==='upload'),false);
});
