import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, readlink, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_TAG, ROOT, VERSION, WEBSITE_REPOSITORY, exactReleaseTag, run, safePath, selectArtifact, sdkHostId } from './sdk-install.mjs';
import { assertNewReleaseTag } from './legacy-release-storage.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const repository = WEBSITE_REPOSITORY;

export async function uploadApplication(archive, { runCommand = run } = {}) {
  const sidecar=`${archive}.json`,descriptor=JSON.parse(await readFile(sidecar,'utf8'));
  assert.equal(descriptor.schemaVersion,1);assert.equal(descriptor.kind,'showcase-application/1');assert.equal(descriptor.runtimeVersion,VERSION);assert.equal(descriptor.profile,'restricted-showcase');assert.equal(descriptor.repository,repository);const releaseTag=exactReleaseTag(descriptor.releaseTag);assert.equal(basename(archive),descriptor.fileName);
  assertNewReleaseTag(releaseTag);
  const bytes=await readFile(archive);assert.equal(bytes.length,descriptor.size);assert.equal(sha(bytes),descriptor.sha256);
  assert.equal((await runCommand('gh',['repo','view',repository,'--json','isPrivate','--jq','.isPrivate'])).trim(),'true');
  const paths=[archive,sidecar];
  if(descriptor.notices) {
    safePath(descriptor.notices.fileName);assert.equal(basename(descriptor.notices.fileName),descriptor.notices.fileName);
    const path=resolve(dirname(archive),descriptor.notices.fileName),bytes=await readFile(path);
    assert.equal(bytes.length,descriptor.notices.size);assert.equal(sha(bytes),descriptor.notices.sha256);paths.push(path);
  }
  const assets=JSON.parse(await runCommand('gh',['release','view',releaseTag,'--repo',repository,'--json','assets'])).assets,missing=[];
  for(const path of paths) {
    const local=await readFile(path),matches=assets.filter(asset=>asset.name===basename(path));assert.ok(matches.length<=1);
    if(matches.length){assert.equal(matches[0].state,'uploaded');assert.equal(matches[0].size,local.length);assert.equal(matches[0].digest,`sha256:${sha(local)}`,'Existing immutable application asset differs');}
    else missing.push(path);
  }
  if(missing.length)await runCommand('gh',['release','upload',releaseTag,...missing,'--repo',repository]);
  const after=JSON.parse(await runCommand('gh',['release','view',releaseTag,'--repo',repository,'--json','assets'])).assets,uploaded=[];
  for(const path of paths) {
    const local=await readFile(path),matches=after.filter(asset=>asset.name===basename(path));assert.equal(matches.length,1);
    assert.equal(matches[0].state,'uploaded');assert.equal(matches[0].size,local.length);assert.equal(matches[0].digest,`sha256:${sha(local)}`);uploaded.push(matches[0]);
  }
  const receipt={schemaVersion:1,repository,releaseTag,assets:uploaded};
  await writeFile(`${archive}.upload.json`,JSON.stringify(receipt,null,2)+'\n');
  return receipt;
}

async function packageNotices({sdk,id,out,stem,work}) {
  const directory=resolve(ROOT,'.runtime/sdk',id.startsWith('flutter/')?'flutter':id.startsWith('react-native/')?'react-native':id);
  const files=sdk.files.filter(file=>/(?:^|\/)(?:licenses|platform-notices)(?:\/|$)|(?:^|\/)(?:LICENSE(?:[.-]|$)|NOTICE(?:[.-]|$)|COPYING(?:[.-]|$)|THIRD_PARTY)/i.test(file.path));
  if(!files.length) {assert.equal(id,'android','SDK must include its distribution notices');return null;}
  const stage=resolve(work,'notices');await mkdir(stage);
  for(const file of files) {
    safePath(file.path);assert.ok(!/\.(?:a|so|dll|dylib|lib|jar|aar|rs|swift|cpp|h|ts|tsx)$/.test(file.path),'Notices cannot include native code');
    const bytes=await readFile(resolve(directory,file.path));assert.equal(bytes.length,file.size);assert.equal(sha(bytes),file.sha256);
    const path=resolve(stage,file.path);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);
  }
  await writeFile(resolve(stage,'application-sdk-notices.json'),JSON.stringify({schemaVersion:1,sdkId:id,sdkArchiveSha256:sdk.sha256,packRoot:sdk.packRoot,files},null,2)+'\n');
  const fileName=`${stem}.notices.tar.gz`,path=resolve(out,fileName),temporary=resolve(work,fileName);
  try{await lstat(path);throw Error('Immutable notices artifact already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  await run(process.env.PYTHON||'python3',['-c',`import gzip,pathlib,sys,tarfile
source=pathlib.Path(sys.argv[1])
with open(sys.argv[2],'xb') as raw:
 with gzip.GzipFile(fileobj=raw,mode='wb',filename='',mtime=0) as compressed:
  with tarfile.open(fileobj=compressed,mode='w') as archive:
   for path in sorted(source.rglob('*')):
    if path.is_file():
     info=archive.gettarinfo(str(path),arcname='notices/'+path.relative_to(source).as_posix());info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
     with path.open('rb') as content:archive.addfile(info,content)`,stage,temporary]);
  const bytes=await readFile(temporary);await rename(temporary,path);return {fileName,size:bytes.length,sha256:sha(bytes),files:files.length};
}

export async function packageApplication({ family, platform, receipt: receiptPath, upload = false }) {
  assert.ok(['native','flutter','react-native','harmony'].includes(family));
  assert.ok(['android','ios','macos','windows','linux','harmony'].includes(platform));
  const receiptBytes = await readFile(receiptPath), receipt = JSON.parse(receiptBytes);
  assert.equal(receipt.version,VERSION);assert.equal(receipt.profile,'restricted-showcase');assert.equal(receipt.platform,platform);
  assert.ok(receipt.build === 'passed' || receipt.status === 'built','A successful original application build receipt is required');
  const id=family==='native' ? ['macos','windows','linux'].includes(platform)?`desktop/${platform}`:platform : family==='harmony'?'harmony':sdkHostId(family,platform);
  const lock=JSON.parse(await readFile(resolve(ROOT,'platforms/sdk-artifacts.lock.json'),'utf8')),sdk=selectArtifact(lock,id);
  assert.equal(receipt.packRoot,sdk.packRoot);assert.equal(receipt.sdkArchiveSha256 ?? receipt.sdk?.archiveSha256,sdk.sha256);
  const delivery=resolve(ROOT,'artifacts/delivery',family,platform);assert.equal(resolve(receipt.delivery.path),delivery);
  const filesBytes=await readFile(resolve(delivery,'files.json')),expected=JSON.parse(filesBytes);
  assert.equal(expected.length,receipt.delivery.files);assert.ok(expected.length>0);
  const roots=(await readdir(delivery)).filter(path=>path!=='files.json');assert.equal(roots.length,1);
  const application=resolve(delivery,roots[0]); assert.ok(!(await lstat(application)).isSymbolicLink(),'Application root cannot be a link');
  const canonical=await realpath(application),actual=[];
  const visit=async(path,relative,ancestors=new Set())=>{
    safePath(relative);assert.ok(!/\.(?:pdb|map|debug|symbols|rs)$/.test(relative)&&!relative.split('/').some(part=>['.private','crates','.git'].includes(part)||part.endsWith('.dSYM')),'Application contains source or debug material');
    const info=await lstat(path);
    if(info.isSymbolicLink()) {
      const link=await readlink(path);assert.ok(!link.startsWith('/')&&!link.includes('\\'),'Absolute/foreign application link');
      const target=await realpath(path);assert.ok(target===canonical||target.startsWith(canonical+sep),'Application link escapes its bundle');
    }
    const target=info.isSymbolicLink()?await lstat(await realpath(path)):info;
    if(target.isDirectory()){
      const canonicalDirectory=await realpath(path);assert.ok(!ancestors.has(canonicalDirectory),'Recursive application bundle link');const nested=new Set(ancestors);nested.add(canonicalDirectory);
      for(const name of await readdir(path))await visit(resolve(path,name),`${relative}/${name}`,nested);
    }
    else {assert.ok(target.isFile());const bytes=await readFile(path);actual.push({path:relative,size:bytes.length,sha256:sha(bytes)});}
  };
  await visit(application,basename(application));
  assert.deepEqual(actual.sort((a,b)=>a.path.localeCompare(b.path)),[...expected].sort((a,b)=>a.path.localeCompare(b.path)),'Application bytes changed after build delivery staging');
  let signing=receipt.signing ?? 'not-verified',label='unsigned';
  if(platform==='android'){assert.equal(signing?.verified,true,'Android delivery requires verified APK signing');label='signed';}
  if(platform==='ios')label=String(signing).includes('simulator')||receipt.commands?.some(item=>item.command?.includes('--simulator'))?'unsigned-simulator':'unsigned-device';
  const contentSha256=sha(filesBytes),producerReceiptSha256=sha(receiptBytes),extension=extname(application),single=['.apk','.hap'].includes(extension);
  // Identical application bytes can be verified by different original builds.
  // Keep each receipt-bound sidecar immutable instead of colliding on its name.
  const fileName=`showcase-${family}-${platform}-${VERSION}-${sdk.packRoot.slice(0,12)}-${contentSha256.slice(0,12)}-${producerReceiptSha256.slice(0,12)}-${label}${single?extension:'.tar.gz'}`;
  const out=resolve(ROOT,'artifacts/private/applications');await mkdir(out,{recursive:true});
  const archive=resolve(out,fileName),sidecar=resolve(out,`${fileName}.json`);
  for(const path of [archive,sidecar]){try{await lstat(path);throw Error('Immutable application artifact already exists');}catch(error){if(error.code!=='ENOENT')throw error;}}
  const work=resolve(out,`.app-seal-${randomUUID()}`);await mkdir(work);
  try {
    const temporary=resolve(work,fileName);
    if(single)await cp(application,temporary);
    else await run(process.env.PYTHON||'python3',['-c',`import gzip,pathlib,sys,tarfile
source=pathlib.Path(sys.argv[1])
def metadata(info):
 info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
 return info
with open(sys.argv[2],'xb') as raw:
 with gzip.GzipFile(fileobj=raw,mode='wb',filename='',mtime=0) as compressed:
  with tarfile.open(fileobj=compressed,mode='w') as archive:archive.add(source,arcname=source.name,filter=metadata)`,application,temporary]);
    const notices=await packageNotices({sdk,id,out,stem:fileName,work});
    const bytes=await readFile(temporary),descriptor={schemaVersion:1,kind:'showcase-application/1',runtimeVersion:VERSION,profile:'restricted-showcase',repository,releaseTag:RELEASE_TAG,family,platform,packRoot:sdk.packRoot,policySha256:sdk.policySha256,sdkArchiveSha256:sdk.sha256,producerReceiptSha256,deliveryInventorySha256:contentSha256,fileName,size:bytes.length,sha256:sha(bytes),signing,execution:receipt.execution??'not-run',notices};
    await rename(temporary,archive);await writeFile(sidecar,JSON.stringify(descriptor,null,2)+'\n',{flag:'wx'});
    if(upload)await uploadApplication(archive);
    return {archive,sidecar,...descriptor,uploaded:upload};
  } finally {await rm(work,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2),options={};
    if(args[0]==='--upload-only'){assert.equal(args.length,2);console.log(JSON.stringify(await uploadApplication(resolve(args[1]))));process.exit(0);}
    for(let index=0;index<args.length;index++) {
      if(args[index]==='--upload'){assert.ok(!options.upload);options.upload=true;continue;}
      const key={'--family':'family','--platform':'platform','--receipt':'receipt'}[args[index]];assert.ok(key&&args[index+1]&&!options[key]);options[key]=args[++index];
    }
    console.log(JSON.stringify(await packageApplication(options)));
  } catch(error){console.error(error.message);process.exitCode=1;}
}
