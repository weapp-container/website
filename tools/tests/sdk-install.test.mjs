import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exactReleaseTag, install, run, sdkHostId, selectArtifact, VERSION, RELEASE_TAG, WEBSITE_REPOSITORY, LEGACY_SHOWCASE_REPOSITORY } from '../sdk-install.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
async function fixture(t, extra = [], { id = 'android', component = 'android-sdk', target = 'android' } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'showcase-sdk-test-'))); t.after(() => rm(root, { recursive: true, force: true }));
  const binding = {runtimeVersion: VERSION, profile: 'restricted-showcase', packRoot: '1'.repeat(64), policySha256: '2'.repeat(64), producerReceiptSha256: '3'.repeat(64), component, target};
  const members = [{path:'showcase-distribution.json', data:JSON.stringify(binding)}, {path:'maven/sdk.bin', data:'bounded test fixture'}, ...extra];
  const fileName = `${id.replaceAll('/', '-')}-fixture.tar.gz`, archive = join(root, fileName);
  await run('python3', ['-c', `import io,json,sys,tarfile
with tarfile.open(sys.argv[1],'w:gz') as archive:
 for item in json.loads(sys.argv[2]):
  data=item['data'].encode();info=tarfile.TarInfo(item['path']);info.size=len(data)
  if item.get('link'):info.type=tarfile.SYMTYPE;info.linkname=item['link'];info.size=0;archive.addfile(info)
  else:archive.addfile(info,io.BytesIO(data))`, archive, JSON.stringify(members)]);
  const bytes = await readFile(archive), files = members.map(item => ({path:item.path, size:Buffer.byteLength(item.data), sha256:sha(item.data)}));
  const entry = {id, fileName, size:bytes.length, sha256:sha(bytes), ...binding, files};
  const lock = {schemaVersion:1, format:'showcase-sdk-artifacts/1', runtimeVersion:VERSION, profile:binding.profile, repository:WEBSITE_REPOSITORY, releaseTag:RELEASE_TAG, artifacts:[entry]};
  const manifest = join(root, 'lock.json'); await writeFile(manifest, JSON.stringify(lock));
  return {root, manifest, lock, entry, archive, destination:join(root,'installed')};
}
test('a pinned private SDK installs once and preserves its reviewed bytes', async t => {
  const f = await fixture(t);
  const result = await install({manifest:f.manifest, id:'android', offline:f.root, destination:f.destination});
  assert.equal(result.status, 'installed-verified');
  assert.equal(await readFile(join(f.destination,'maven/sdk.bin'),'utf8'), 'bounded test fixture');
  const receipt = JSON.parse(await readFile(join(f.destination,'.showcase-install.json'),'utf8'));
  assert.equal(receipt.archiveSha256, f.entry.sha256); assert.equal(receipt.binding.policySha256, f.entry.policySha256);
  await assert.rejects(install({manifest:f.manifest,id:'android',offline:f.root,destination:f.destination}), /already exists/);
});
test('full profiles, stale releases and unreviewed repositories are rejected', async t => {
  const f = await fixture(t);
  for (const mutation of [{profile:'full'},{runtimeVersion:'0.0.0'},{repository:'other/repo'},{releaseTag:'latest'}]) assert.throws(() => selectArtifact({...f.lock,...mutation},'android'));
  assert.throws(() => selectArtifact(f.lock,'ios'), /No exact current restricted SDK artifact/);
});
test('candidate tags are exact and artifact entries cannot override the repository', async t => {
  const f = await fixture(t);
  for (const releaseTag of ['latest',`showcase-v${VERSION}`,`showcase-v${VERSION}-candidate0`,`showcase-v${VERSION}-candidate03`,`showcase-v${VERSION}-candidate9\n`,`showcase-v${VERSION}-candidate9/asset`,`showcase-v0.0.0-candidate9`]) {
    assert.throws(() => exactReleaseTag(releaseTag), /exact current Showcase candidate/);
    assert.throws(() => selectArtifact({...f.lock,releaseTag},'android'));
    const candidate = structuredClone(f.lock); candidate.artifacts[0].releaseTag = releaseTag;
    assert.throws(() => selectArtifact(candidate,'android'), /exact current Showcase candidate/);
  }
  for (const repository of ['other/repo','weapp-container/runtime-artifacts',f.lock.repository]) {
    const candidate = structuredClone(f.lock); candidate.artifacts[0].repository = repository;
    assert.throws(() => selectArtifact(candidate,'android'), /cannot override/);
  }
});
test('mixed candidates download each exact entry release and keep the lock release as the fallback', async t => {
  const android = await fixture(t), ios = await fixture(t,[],{id:'ios',component:'ios-sdk',target:'ios'});
  const previousTag = `showcase-v${VERSION}-candidate3`;
  const lock = {...android.lock,artifacts:[{...android.entry,releaseTag:previousTag},ios.entry]};
  await writeFile(android.manifest,JSON.stringify(lock));
  const downloads = [];
  const runCommand = async (command,args) => {
    const entry = lock.artifacts.find(item => item.fileName === args[args.indexOf('--pattern')+1]);
    assert.ok(entry);assert.equal(command,'gh');
    assert.deepEqual(args.slice(0,7),['release','download',entry.id === 'android' ? previousTag : RELEASE_TAG,'--repo',entry.id === 'android' ? 'weapp-container/website-private-archive' : lock.repository,'--pattern',entry.fileName]);
    downloads.push([entry.id,args[2]]);
    await copyFile(entry.id === 'android' ? android.archive : ios.archive,join(args[args.indexOf('--dir')+1],entry.fileName));
    return '';
  };
  for (const id of ['android','ios']) {
    const result = await install({manifest:android.manifest,id,destination:join(android.root,`installed-${id}`)},{runCommand});
    assert.equal(result.status,'installed-verified');
  }
  assert.deepEqual(downloads,[['android',previousTag],['ios',RELEASE_TAG]]);
  const oldLock = {...android.lock,releaseTag:previousTag};
  assert.equal(selectArtifact(oldLock,'android').releaseTag,previousTag);
});
test('legacy showcase locks download only their exact historical release from the old repository', async t => {
  const f = await fixture(t);
  f.lock.repository = LEGACY_SHOWCASE_REPOSITORY;
  f.lock.releaseTag = `showcase-v${VERSION}-candidate3`;
  await writeFile(f.manifest, JSON.stringify(f.lock));
  const result = await install({manifest:f.manifest,id:'android',destination:f.destination}, {
    runCommand: async (command,args) => {
      assert.equal(command,'gh');
      assert.deepEqual(args.slice(0,7),['release','download',f.lock.releaseTag,'--repo','weapp-container/website-private-archive','--pattern',f.entry.fileName]);
      await copyFile(f.archive,join(args[args.indexOf('--dir')+1],f.entry.fileName));
      return '';
    },
  });
  assert.equal(result.status,'installed-verified');
});
test('Flutter iOS selects its independent candidate while Android and macOS keep the shared SDK', () => {
  assert.equal(sdkHostId('flutter','ios'),'flutter/ios');
  for(const platform of ['android','macos'])assert.equal(sdkHostId('flutter',platform),'flutter/android-ios-macos');
  for(const platform of ['windows','linux'])assert.equal(sdkHostId('flutter',platform),`flutter/${platform}`);
  assert.equal(sdkHostId('react-native','ios'),'react-native/android-ios');
});
test('archive bytes cannot change under a pinned digest', async t => {
  const f = await fixture(t); const data = await readFile(f.archive); data[data.length - 1] ^= 1; await writeFile(f.archive,data);
  await assert.rejects(install({manifest:f.manifest,id:'android',offline:f.root,destination:f.destination}), /SHA-256 mismatch/);
});
test('links cannot escape extraction even when archive and inventory hashes match', async t => {
  const f = await fixture(t,[{path:'maven/link',data:'',link:'../../outside'}]);
  await assert.rejects(install({manifest:f.manifest,id:'android',offline:f.root,destination:f.destination}), /bounded path\/size\/hash extraction/);
});
test('traversal and duplicate inventory entries fail before extraction', async t => {
  const f = await fixture(t);
  for (const path of ['../outside','/absolute','maven/../outside','maven\\outside']) {
    const candidate = structuredClone(f.lock); candidate.artifacts[0].files[1].path = path;
    assert.throws(() => selectArtifact(candidate,'android'), /Unsafe artifact path/);
  }
  const candidate = structuredClone(f.lock); candidate.artifacts[0].files.push(candidate.artifacts[0].files[0]);
  assert.throws(() => selectArtifact(candidate,'android'));
});
test('private Rust source and debug maps never enter a consumer SDK', async t => {
  for (const path of ['crates/runtime/lib.rs','wrapper/source.map']) {
    const f = await fixture(t,[{path,data:'private fixture'}]);
    await assert.rejects(install({manifest:f.manifest,id:'android',offline:f.root,destination:f.destination}), /bounded path\/size\/hash extraction/);
  }
});
