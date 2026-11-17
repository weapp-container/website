import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {inventory,sha} from './export-toolchain.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(process.argv[2]||resolve(root,'artifacts/web/snapshots'));
const dist=resolve(root,'dist');
assert.ok(relative(dist,out).startsWith('..'+sep),'Snapshot must remain outside the public distribution');
const verify=spawnSync(process.execPath,['tools/verify-site.mjs'],{cwd:root,encoding:'utf8'});
assert.equal(verify.status,0,verify.stderr||verify.stdout);
const source=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
assert.equal(source.status,0,source.stderr);
const files=await inventory(dist);
const fileInventorySha256=sha(Buffer.from(JSON.stringify(files,null,2)+'\n'));
const name='showcase-site-'+fileInventorySha256.slice(0,16);
const config=JSON.parse(await readFile(resolve(dist,'showcase-runtime.json')));
await mkdir(out,{recursive:true});
const archive=resolve(out,name+'.tar.gz');
const program=`import gzip,tarfile,sys,pathlib,io
r=pathlib.Path(sys.argv[1])
with open(sys.argv[2],'xb') as out:
 with gzip.GzipFile(fileobj=out,mode='wb',mtime=0,filename='') as gz:
  with tarfile.open(fileobj=gz,mode='w') as tar:
   for p in sorted(r.rglob('*')):
    if p.is_file():
     b=p.read_bytes();i=tarfile.TarInfo(p.relative_to(r).as_posix());i.size=len(b);i.mode=0o644;i.mtime=0
     tar.addfile(i,io.BytesIO(b))`;
const tar=spawnSync('python3',['-c',program,dist,archive],{encoding:'utf8'});
assert.equal(tar.status,0,tar.stderr);
const bytes=await readFile(archive);
const receipt={schemaVersion:1,kind:'source-free-showcase-site',sourceCommit:source.stdout.trim(),...config,
  fileInventorySha256,files,archive:{fileName:name+'.tar.gz',sha256:sha(bytes),size:bytes.length},
  scope:'Exact verified static assets only. Deployment version and live acceptance are recorded separately.'};
await writeFile(resolve(out,name+'.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({archive,...receipt.archive,fileInventorySha256,files:files.length,sourceCommit:receipt.sourceCommit},null,2));
