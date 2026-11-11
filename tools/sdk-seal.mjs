import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, VERSION, RELEASE_TAG, run, safePath, selectArtifact, validateSdkLock } from './sdk-install.mjs';
import { FONT_FILES } from './native-font.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = /^[a-f0-9]{64}$/;
const nativeFontIdentity = {fontSha256:FONT_FILES[0].sha256,fontBytes:FONT_FILES[0].size,licenseSha256:FONT_FILES[1].sha256,licenseBytes:FONT_FILES[1].size,markerVerified:true};
function identity(receipt, policySha256, wrapper = false) {
  assert.equal(receipt.schemaVersion ?? receipt.schema, 1); assert.equal(wrapper ? receipt.sdkVersion ?? receipt.version : receipt.sdkVersion, VERSION);
  assert.equal(receipt.distributionProfile, 'restricted-showcase'); assert.equal(receipt.policySha256, policySha256);
  assert.equal(receipt.sourceDirty, false); assert.match(receipt.sourceCommit, /^[a-f0-9]{40}$/);
  if (Array.isArray(receipt.checks)) assert.ok(!receipt.checks.some(check => typeof check === 'object' && (['failed', 'blocked'].includes(check.status) || (check.exitCode != null && check.exitCode !== 0))));
}
export async function seal({ source, receipt: receiptPath, nativeReceipts = [], id, component, target, replaceSha256, policy = resolve(ROOT, 'artifacts/miniapp/policy.json'), prefix = '', out = resolve(ROOT, 'artifacts/private/sdk'), manifest = resolve(ROOT, 'platforms/sdk-artifacts.lock.json') }) {
  assert.ok(source && receiptPath && id && component && target, '--source, --receipt, --id, --component and --target are required');
  assert.match(id, /^[a-z][a-z0-9/-]+$/); assert.match(component, /^[a-z][a-z0-9-]+$/); assert.match(target, /^[a-z][a-z0-9_-]+$/);
  if (prefix) safePath(prefix);
  const policyValue = JSON.parse(await readFile(policy, 'utf8'));
  assert.deepEqual(Object.keys(policyValue).sort(), ['allowedApis', 'allowedPackRoots', 'schemaVersion']); assert.equal(policyValue.schemaVersion, 1);
  assert.ok(policyValue.allowedPackRoots.every(value => hash.test(value)) && policyValue.allowedPackRoots.length === 1);
  const canonical = { allowedApis: [...policyValue.allowedApis].sort(), allowedPackRoots: [...policyValue.allowedPackRoots].sort(), schemaVersion: 1 };
  const policySha256 = sha(JSON.stringify(canonical)), packRoot = canonical.allowedPackRoots[0];
  const receiptBytes = await readFile(receiptPath), receipt = JSON.parse(receiptBytes), producerReceiptSha256 = sha(receiptBytes);
  const parents = []; let harmonyNative = null, harmonyIntegration = null;
  if (component === 'harmony-sdk') {
    assert.equal(receipt.schemaVersion,1); assert.equal(receipt.sdkVersion,VERSION); assert.equal(receipt.profile,'release');assert.equal(receipt.mode,'build');
    assert.equal(receipt.distributionProfile,'restricted-showcase'); assert.equal(receipt.policySha256,policySha256);
    assert.equal(receipt.sourceBefore?.sourceDirty,false); assert.equal(receipt.sourceAfter?.sourceDirty,false);
    assert.match(receipt.commit,/^[a-f0-9]{40}$/); assert.equal(receipt.sourceBefore.sourceCommit,receipt.commit);assert.equal(receipt.sourceAfter.sourceCommit,receipt.commit);assert.ok(!receipt.sourceError);
    const matches=receipt.platforms?.filter(item=>item.platform==='harmony');assert.equal(matches?.length,1);
    const item=matches[0];assert.equal(item.status,'passed');assert.equal(item.cargo?.status,'passed');assert.equal(item.mode,'build');assert.equal(item.profile,'release');
    assert.equal(item.distributionProfile,'restricted-showcase');assert.equal(item.policySha256,policySha256);assert.equal(item.compiledIdentity?.markerVerified,true);assert.equal(item.appIntegration?.status,'passed');
    harmonyIntegration=item.appIntegration.artifacts;assert.ok(Array.isArray(harmonyIntegration)&&harmonyIntegration.length===2);
    assert.deepEqual(harmonyIntegration.map(artifact=>basename(artifact.path)).sort(),['libcontainer_host_harmony.so','libentry.so']);
    for(const artifact of harmonyIntegration){assert.match(artifact.sha256,hash);assert.ok(Number.isSafeInteger(artifact.bytes)&&artifact.bytes>0);assert.equal(artifact.hardening?.debugInfo,false);assert.equal(artifact.hardening?.localBuildPaths,false);assert.match(artifact.hardening?.inspectorSha256,hash);}
    const core=harmonyIntegration.find(artifact=>basename(artifact.path)==='libcontainer_host_harmony.so');assert.equal(item.artifact?.sha256,core.sha256);assert.equal(item.artifact?.bytes,core.bytes);
    harmonyNative={schemaVersion:1,sdkVersion:VERSION,distributionProfile:'restricted-showcase',policySha256,status:'built',profile:'release',sourceCommit:receipt.commit,sourceDirty:false,platform:'harmony',features:item.features.split(','),nativeFont:item.nativeFont,artifacts:harmonyIntegration.map(artifact=>({file:artifact.path,bytes:artifact.bytes,sha256:artifact.sha256}))};
  } else identity(receipt, policySha256, true);
  if (component === 'flutter-sdk') {
    assert.ok(['android','ios','macos','windows','linux','android-ios-macos','windows-linux','all'].includes(target));
    const selected = target === 'all' ? ['android','ios','macos','windows','linux'] : target === 'android-ios-macos' ? ['android','ios','macos'] : target === 'windows-linux' ? ['windows','linux'] : [target];
    assert.ok(selected.every(platform => receipt.targets?.[platform]?.status === 'packaged'), 'Flutter target has no successful native packaging receipt');
    assert.ok(nativeReceipts.length > 0, 'Flutter sealing requires its exact native SDK parent receipts');
    for (const path of nativeReceipts) {
      const bytes = await readFile(path), parent = JSON.parse(bytes), digest = sha(bytes);
      const match = Object.entries(receipt.targets).find(([,value]) => value.status === 'packaged' && value.receiptSha256 === digest);
      assert.ok(match, 'Native SDK parent receipt hash differs from the Flutter producer');
      identity(parent, policySha256); assert.ok(['passed','built','verified'].includes(parent.status));
      parents.push({name:match[0],bytes,receipt:parent});
    }
    assert.ok(selected.every(platform => parents.some(parent => parent.name === platform)), 'Flutter native receipt target is missing');
  } else if (component === 'react-native-sdk') {
    assert.equal(receipt.checks?.typescript,true); assert.equal(receipt.checks?.codegen,true);
    for (const platform of ['android','ios']) {const parent=receipt[platform];identity(parent,policySha256);assert.ok(['passed','built'].includes(parent.status));parents.push({name:platform,receipt:parent});}
  } else if(component!=='harmony-sdk') assert.ok(component === 'desktop-sdk' ? receipt.status === 'verified' : ['passed', 'built'].includes(receipt.status), 'SDK producer has no successful verification receipt');
  const native = harmonyNative ? [harmonyNative] : parents.length ? parents.flatMap(parent => parent.receipt.native) : receipt.native || [receipt]; assert.ok(Array.isArray(native) && native.length > 0);
  const nativeCore = [], nativeImports = [];
  for (const item of native) {
    identity(item, policySha256); assert.equal(item.status, 'built'); assert.equal(item.profile, 'release');
    assert.ok(item.features.includes('restricted-showcase'), 'Producer did not compile the restricted feature');
    // SDK nativeIdentity projections predate the font receipt field. The
    // exact core bytes and font marker are independently verified below.
    if(item.nativeFont!==undefined) assert.deepEqual(item.nativeFont,nativeFontIdentity,'Producer native font identity differs');
    if(component==='harmony-sdk') assert.deepEqual(item.nativeFont,nativeFontIdentity,'Harmony producer lacks its original compiled font proof');
    assert.ok(Array.isArray(item.artifacts) && item.artifacts.length > 0);
    if (item.platform === 'windows') assert.ok(item.artifacts.some(artifact => basename(artifact.file) === 'weapp_container_sdk.dll.lib'), 'Windows producer omits its native import interface');
    for (const artifact of item.artifacts) {
      const name = basename(artifact.file);
      if (item.platform === 'windows' && name === 'weapp_container_sdk.dll.lib') nativeImports.push({ sha256: artifact.sha256, size: artifact.bytes });
      const selected = item.platform === 'android' ? name === 'libweapp_container_sdk.so'
        : item.platform === 'windows' ? name === 'weapp_container_sdk.dll'
        : item.platform === 'harmony' ? name === 'libcontainer_host_harmony.so'
        : name === 'libweapp_container_sdk.a';
      if (selected) nativeCore.push({ sha256: artifact.sha256, size: artifact.bytes });
    }
  }
  assert.ok(nativeCore.length > 0, 'Producer has no reviewed native core inventory');
  await mkdir(out, { recursive: true });
  const work = resolve(out, `.seal-${randomUUID()}`), prepared = resolve(work, 'payload'); await mkdir(prepared, { recursive: true });
  try {
    const stage = async (directory, relative = '') => {
      assert.ok(!(await lstat(directory)).isSymbolicLink(), 'SDK source cannot contain links');
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = relative ? `${relative}/${entry.name}` : entry.name; safePath(path);
        assert.ok(!path.split('/').some(part => ['.git','.private','source','crates','cargo-target','build','.gradle','.cxx'].includes(part) || part.endsWith('.dSYM')) && !/\.(?:rs|pdb|map|debug|symbols)$/.test(path) && !path.endsWith('Cargo.toml'), `Private/intermediate SDK content: ${path}`);
        const from = resolve(directory, entry.name), to = resolve(prepared, prefix, path);
        assert.ok(!entry.isSymbolicLink(), 'SDK source cannot contain links');
        if (entry.isDirectory()) await stage(from, path);
        else { assert.ok(entry.isFile()); await mkdir(dirname(to), { recursive: true }); await cp(from, to); }
      }
    };
    await stage(resolve(source));
    if(harmonyIntegration) {
      const checked = async path => { safePath(path); const bytes = await readFile(resolve(prepared,path)); return {path,size:bytes.length,sha256:sha(bytes)}; };
      const libraries=[];
      for(const artifact of harmonyIntegration){const value=await checked(`libs/arm64-v8a/${basename(artifact.path)}`);assert.equal(value.size,artifact.bytes);assert.equal(value.sha256,artifact.sha256);libraries.push(value);}
      const metadataPath='platform-notices/OHOS-NATIVE-SDK.json',metadata=JSON.parse(await readFile(resolve(prepared,metadataPath),'utf8'));
      assert.equal(metadata.path,'native');assert.equal(metadata.displayName,'Native');assert.equal(metadata.releaseType,'Release');assert.match(metadata.apiVersion,/^[1-9][0-9]{0,3}$/);assert.match(metadata.version,/^[0-9]+(?:\.[0-9]+){3}$/);
      const runtimePath='libs/arm64-v8a/libc++_shared.so',runtime=await readFile(resolve(prepared,runtimePath));assert.ok(runtime.length>=64&&runtime.subarray(0,6).equals(Buffer.from([127,69,76,70,2,1]))&&runtime.readUInt16LE(18)===183,'Harmony C++ runtime must be AArch64 ELF64');
      const notices=JSON.parse(await readFile(resolve(prepared,'platform-notices/identity.json'),'utf8'));
      assert.deepEqual(notices,{schemaVersion:1,kind:'harmony-native-library-platform-notices',sdkVersion:VERSION,sourceCommit:receipt.commit,target:receipt.platforms.find(item=>item.platform==='harmony').target,distributionProfile:'restricted-showcase',policySha256,producerReportSha256:producerReceiptSha256,sdk:{apiVersion:metadata.apiVersion,version:metadata.version,metadata:await checked(metadataPath)},nativeLibraries:libraries.sort((a,b)=>a.path.localeCompare(b.path)),runtime:{...await checked(runtimePath),sdkPath:'native/llvm/lib/aarch64-linux-ohos/libc++_shared.so'},notice:await checked('platform-notices/OHOS-NATIVE-NOTICE.txt')});
    }
    await writeFile(resolve(prepared, 'producer-receipt.json'), receiptBytes);
    for (const parent of parents) if(parent.bytes) {const path=resolve(prepared,'native-producer-receipts',`${parent.name}-${sha(parent.bytes)}.json`);await mkdir(dirname(path),{recursive:true});await writeFile(path,parent.bytes);}
    const binding = { schemaVersion: 1, runtimeVersion: VERSION, profile: 'restricted-showcase', packRoot, policySha256, component, target, producerReceiptSha256 };
    await writeFile(resolve(prepared, 'showcase-distribution.json'), JSON.stringify(binding, null, 2) + '\n');
    // Re-open packaged AARs as well as direct native binaries. Every source
    // native core slice must be present with its original bytes and marker.
    const verified = JSON.parse(await run(process.env.PYTHON || 'python3', ['-c', `import hashlib,json,pathlib,struct,sys,zipfile
root=pathlib.Path(sys.argv[1]);expected=json.loads(sys.argv[2]);marker=sys.argv[3].encode()+b'\\0';font_marker=sys.argv[4].encode()+b'\\0';license_sha256=sys.argv[5];imports=json.loads(sys.argv[6]);found=set();import_found=set();font_license=False
def inspect(name,data):
 if 'weapp_container_sdk' not in name and 'container_host_harmony' not in name:return
 if not name.endswith(('.a','.so','.dylib','.dll','.lib')):return
 if pathlib.PurePosixPath(name).name=='weapp_container_sdk.dll.lib':
  digest=hashlib.sha256(data).hexdigest()
  if not any(e['sha256']==digest and e['size']==len(data) for e in imports):raise ValueError('unreviewed native import library bytes: '+name)
  import_found.add(digest)
  return
 magic=data[:4]
 if magic in (bytes.fromhex('cafebabe'),bytes.fromhex('bebafeca'),bytes.fromhex('cafebabf'),bytes.fromhex('bfbafeca')):
  endian='>' if magic in (bytes.fromhex('cafebabe'),bytes.fromhex('cafebabf')) else '<';wide=magic in (bytes.fromhex('cafebabf'),bytes.fromhex('bfbafeca'));count=struct.unpack_from(endian+'I',data,4)[0]
  if count<1 or count>16:raise ValueError('Invalid universal archive slice count')
  for index in range(count):
   at=8+index*(32 if wide else 20);offset,size=struct.unpack_from(endian+('QQ' if wide else 'II'),data,at+8)
   if offset<8+count*(32 if wide else 20) or size<=0 or offset+size>len(data):raise ValueError('Invalid universal archive slice')
   inspect(name,data[offset:offset+size])
  return
 digest=hashlib.sha256(data).hexdigest()
 if marker not in data:raise ValueError('missing compiled restricted identity: '+name)
 if font_marker not in data:raise ValueError('missing compiled reviewed native font identity: '+name)
 if not any(e['sha256']==digest and e['size']==len(data) for e in expected):raise ValueError('unreviewed native core bytes: '+name)
 found.add(digest)
for file in root.rglob('*'):
 if not file.is_file():continue
 if file.suffix in ('.aar','.zip'):
  with zipfile.ZipFile(file) as z:
   for name in z.namelist():
    info=z.getinfo(name)
    if info.file_size>512*1024*1024:raise ValueError('oversize SDK ZIP member')
    if 'weapp_container_sdk' in name or 'container_host_harmony' in name:inspect(name,z.read(name))
    if info.file_size==4388 and hashlib.sha256(z.read(name)).hexdigest()==license_sha256:font_license=True
 else:
  data=file.read_bytes();inspect(file.name,data)
  if len(data)==4388 and hashlib.sha256(data).hexdigest()==license_sha256:font_license=True
if set(e['sha256'] for e in expected)!=found:raise ValueError('packaged SDK omits a source native core slice')
if set(e['sha256'] for e in imports)!=import_found:raise ValueError('packaged SDK omits a source native import library')
if not font_license:raise ValueError('SDK omits the exact license for its compiled Noto font')
print(json.dumps({'nativeCoreSlices':len(found),'nativeImportLibraries':len(import_found),'nativeFontLicenseVerified':True}))`, prepared, JSON.stringify(nativeCore), `weapp-container-distribution:restricted-showcase:${policySha256}`, `weapp-container-native-font:${FONT_FILES[0].sha256}:${FONT_FILES[1].sha256}`, FONT_FILES[1].sha256, JSON.stringify(nativeImports)]));
    const files = [];
    const inventory = async (directory, relative = '') => {
      for (const item of (await readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
        const path = relative ? `${relative}/${item.name}` : item.name;
        if (item.isDirectory()) await inventory(resolve(directory, item.name), path);
        else { const bytes = await readFile(resolve(directory, item.name)); files.push({ path, size: bytes.length, sha256: sha(bytes) }); }
      }
    };
    await inventory(prepared);
    const fileName = `showcase-${id.replaceAll('/', '-')}-${VERSION}-${packRoot.slice(0,12)}-${producerReceiptSha256.slice(0,12)}.tar.gz`, temporary = resolve(work, fileName);
    await run(process.env.PYTHON || 'python3', ['-c', `import gzip,json,pathlib,sys,tarfile
root=pathlib.Path(sys.argv[1]);files=json.loads(sys.argv[3])
with open(sys.argv[2],'wb') as raw:
 with gzip.GzipFile(fileobj=raw,mode='wb',filename='',mtime=0) as compressed:
  with tarfile.open(fileobj=compressed,mode='w') as archive:
   for item in files:
    path=root/item['path'];info=archive.gettarinfo(str(path),arcname=item['path']);info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
    with path.open('rb') as content:archive.addfile(info,content)`, prepared, temporary, JSON.stringify(files)]);
    const archive = await readFile(temporary), entry = { id, component, target, runtimeVersion: VERSION, profile: binding.profile, releaseTag: RELEASE_TAG, fileName, size: archive.length, sha256: sha(archive), packRoot, policySha256, producerReceiptSha256, files };
    const destination = resolve(out, fileName);
    try { await stat(destination); throw Error('SDK archive already exists; choose a fresh --out'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const lockBytes = await readFile(manifest), lock = validateSdkLock(JSON.parse(lockBytes));
    const previous = lock.artifacts.filter(item => item.id === id);
    if (replaceSha256 !== undefined) {
      assert.match(replaceSha256, hash); assert.equal(previous.length, 1, 'SDK replacement requires one current artifact');
      assert.equal(previous[0].sha256, replaceSha256, 'Current SDK differs from the expected replacement digest');
      const current = selectArtifact(lock, id);
      for (const key of ['component', 'target']) assert.equal(current[key], entry[key], `SDK replacement changes its ${key} boundary`);
      assert.notEqual(previous[0].fileName, fileName, 'SDK replacement requires a new original producer receipt identity');
      lock.artifacts = lock.artifacts.filter(item => item.id !== id);
    } else assert.equal(previous.length, 0, 'SDK lock already contains this id; supply its exact --replace-sha256 when producing an immutable replacement');
    lock.artifacts.push(entry); lock.artifacts.sort((a,b) => a.id.localeCompare(b.id)); lock.status = 'current-restricted-artifacts-partial';
    assert.deepEqual(await readFile(manifest), lockBytes, 'SDK lock changed during sealing; preserve the new artifact and review the current lock');
    await rename(temporary, destination);
    const lockTemporary = resolve(dirname(manifest), `.sdk-lock-${randomUUID()}.json`);
    try { await writeFile(lockTemporary, JSON.stringify(lock, null, 2) + '\n', { flag: 'wx' }); await rename(lockTemporary, manifest); }
    finally { await rm(lockTemporary, { force: true }); }
    return { archive: destination, id, ...verified, sha256: entry.sha256, packRoot, policySha256 };
  } finally { await rm(work, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), values = {nativeReceipts:[]};
    const names = { '--source':'source', '--receipt':'receipt', '--id':'id', '--component':'component', '--target':'target', '--replace-sha256':'replaceSha256', '--policy':'policy', '--prefix':'prefix', '--out':'out', '--manifest':'manifest' };
    for (let i = 0; i < args.length; i += 2) {
      if(args[i]==='--native-receipt'){assert.ok(args[i+1]);values.nativeReceipts.push(args[i+1]);continue;}
      assert.ok(names[args[i]] && args[i+1] && values[names[args[i]]] === undefined); values[names[args[i]]] = args[i+1];
    }
    console.log(JSON.stringify(await seal(values)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
