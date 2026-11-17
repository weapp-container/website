import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,writeFile,rename,rm,lstat,realpath} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash = /^[a-f0-9]{64}$/;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const safe = value => typeof value === 'string' && value.length > 0 && value.length < 1024 && !/[\\:\x00-\x20\x7f]/.test(value) && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..');
export function selectWebArtifact(manifest) {
  assert.equal(manifest.schemaVersion,1);
  assert.equal(manifest.format,'weapp-container-platform-artifacts/1');
  assert.equal(manifest.family,'web');
  assert.equal(manifest.runtimeVersion,'0.1.0-preview.6.0');
  assert.equal(manifest.distributionProfile,'restricted-showcase');
  assert.match(manifest.policySha256,hash);
  const matches = manifest.artifacts.filter(value => value.coordinate === 'web/worker/canvaskit/restricted-showcase');
  assert.equal(matches.length,1,'An exact Worker + CanvasKit restricted artifact is required');
  const artifact = matches[0];
  assert.equal(artifact.distributionProfile,manifest.distributionProfile);
  assert.equal(artifact.policySha256,manifest.policySha256);
  assert.ok(safe(artifact.fileName) && !artifact.fileName.includes('/') && artifact.fileName.endsWith('.tar.gz'));
  assert.match(artifact.sha256,hash); assert.match(artifact.sourceCommit,/^[a-f0-9]{40}$/);
  assert.match(artifact.producerReportSha256,hash);
  assert.ok(Number.isSafeInteger(artifact.size) && artifact.size > 0 && artifact.size < 256*1024*1024);
  assert.ok(Array.isArray(artifact.files) && artifact.files.length > 0 && artifact.files.length < 10000);
  const paths = new Set();
  for(const file of artifact.files) {
    assert.ok(safe(file.path) && !paths.has(file.path),'Unsafe or duplicate runtime file'); paths.add(file.path);
    assert.match(file.sha256,hash); assert.ok(Number.isSafeInteger(file.size) && file.size >= 0 && file.size <= 25*1024*1024);
  }
  assert.ok(paths.has('release-receipt.json') && paths.has('pack-index.json'));
  return artifact;
}
const extract = String.raw`import hashlib,json,sys,tarfile
from pathlib import Path
j=json.load(sys.stdin);root=Path(j['destination']);root.mkdir();expected={v['path']:v for v in j['files']};seen=set();total=0
with tarfile.open(j['archive'],'r:gz') as tar:
 for item in tar:
  p=item.name.rstrip('/')
  if not p or p.startswith('/') or '\\' in p or ':' in p or any(ord(c)<=32 or ord(c)==127 for c in p) or any(c in ('','.','..') for c in p.split('/')):raise ValueError('unsafe path')
  if item.isdir():continue
  if not item.isfile() or p not in expected or p in seen:raise ValueError('unreviewed member or link')
  f=expected[p];total+=item.size
  if item.size!=f['size'] or item.size>25*1024*1024 or total>256*1024*1024:raise ValueError('size limit')
  data=tar.extractfile(item).read(item.size+1)
  if len(data)!=item.size or hashlib.sha256(data).hexdigest()!=f['sha256']:raise ValueError('digest mismatch')
  target=root/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);seen.add(p)
if seen!=set(expected):raise ValueError('incomplete archive')
`;
export async function installWebRuntime({manifest = resolve(root,'platforms/web-runtime-artifacts.lock.json'),manifestSha256,archive,destination = resolve(root,'.runtime/web')}) {
  assert.match(manifestSha256,hash,'Supply an independently reviewed manifest SHA-256');
  const bytes = await readFile(manifest); assert.equal(sha(bytes),manifestSha256,'Private Web runtime lock mismatch');
  const lock = JSON.parse(bytes), artifact = selectWebArtifact(lock);
  assert.ok(archive,'--archive must point to the authorized private release download');
  const archivePath = resolve(archive), metadata = await lstat(archivePath);
  assert.ok(metadata.isFile() && !metadata.isSymbolicLink() && metadata.size === artifact.size);
  const actual = createHash('sha256'); for await(const bytes of createReadStream(archivePath)) actual.update(bytes);
  assert.equal(actual.digest('hex'),artifact.sha256,'Web runtime archive SHA-256 mismatch');
  const target = resolve(destination), parent = dirname(target); await mkdir(parent,{recursive:true});
  assert.equal(await realpath(parent),parent,'Use a canonical runtime parent');
  try { await lstat(target); throw Error('Runtime installation already exists; use a fresh destination'); } catch(error) { if(error.code !== 'ENOENT') throw error; }
  const work = resolve(parent,`.web-install-${randomUUID()}`);
  try {
    const child = spawn(process.env.PYTHON || 'python3',['-c',extract],{stdio:['pipe','ignore','ignore']});
    child.stdin.end(JSON.stringify({archive:archivePath,destination:work,files:artifact.files}));
    assert.equal(await new Promise((accept,reject)=>{child.once('error',reject);child.once('close',accept);}),0,'Web archive failed bounded path/size/hash extraction');
    const receiptBytes = await readFile(resolve(work,'release-receipt.json')), receipt = JSON.parse(receiptBytes);
    for(const key of ['family','distributionProfile','policySha256']) assert.equal(receipt[key],lock[key]);
    assert.equal(receipt.sdkVersion,lock.runtimeVersion); assert.equal(receipt.coordinate,artifact.coordinate);
    assert.equal(receipt.source.sourceCommit,artifact.sourceCommit); assert.equal(receipt.producerReceipt.sha256,artifact.producerReportSha256);
    const index = JSON.parse(await readFile(resolve(work,'pack-index.json')));
    await writeFile(resolve(work,'.showcase-install.json'),JSON.stringify({schemaVersion:1,manifestSha256,archiveSha256:artifact.sha256,receiptSha256:sha(receiptBytes),packRoot:index.integrityRoot},null,2)+'\n');
    await rename(work,target);
    return {status:'installed-verified',destination:target,receiptSha256:sha(receiptBytes),packRoot:index.integrityRoot,policySha256:lock.policySha256};
  } finally { await rm(work,{recursive:true,force:true}); }
}
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), values = {}, keys = {'--manifest':'manifest','--manifest-sha256':'manifestSha256','--archive':'archive','--destination':'destination'};
  for(let i=0;i<args.length;i+=2) { assert.ok(keys[args[i]] && args[i+1] && values[keys[args[i]]] === undefined,'Unknown/duplicate/missing option'); values[keys[args[i]]] = args[i+1]; }
  console.log(JSON.stringify(await installWebRuntime(values),null,2));
}
