import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {installWebRuntime,selectWebArtifact} from '../tools/install-web-runtime.mjs';
import {verifyModuleClosure} from '../tools/stage-web-runtime.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const policy = 'a'.repeat(64), commit = 'b'.repeat(40), report = 'c'.repeat(64);
const receipt = {family:'web',distributionProfile:'restricted-showcase',policySha256:policy,sdkVersion:'0.1.0-preview.6.0',coordinate:'web/worker/canvaskit/restricted-showcase',source:{sourceCommit:commit},producerReceipt:{sha256:report}};
test('Web consumer admits only the exact private release closure and never overwrites an installation',async () => {
  const directory = await realpath(await mkdtemp(resolve(tmpdir(),'showcase-web-delivery-')));
  try {
    const payload = {'release-receipt.json':JSON.stringify(receipt),'pack-index.json':JSON.stringify({integrityRoot:'d'.repeat(64)})};
    const archive = resolve(directory,'runtime.tar.gz');
    const made = spawnSync('python3',['-c',"import io,json,sys,tarfile\nj=json.load(sys.stdin)\nwith tarfile.open(j['out'],'w:gz') as t:\n for n,d in j['files'].items():\n  b=d.encode();i=tarfile.TarInfo(n);i.size=len(b);t.addfile(i,io.BytesIO(b))"],{input:JSON.stringify({out:archive,files:payload})});
    assert.equal(made.status,0);
    const archiveBytes = await readFile(archive);
    const manifest = {schemaVersion:1,format:'weapp-container-platform-artifacts/1',family:'web',runtimeVersion:receipt.sdkVersion,distributionProfile:receipt.distributionProfile,policySha256:policy,artifacts:[{coordinate:receipt.coordinate,fileName:'runtime.tar.gz',sha256:sha(archiveBytes),size:archiveBytes.length,sourceCommit:commit,producerReportSha256:report,distributionProfile:receipt.distributionProfile,policySha256:policy,files:Object.entries(payload).map(([path,value])=>({path,sha256:sha(value),size:Buffer.byteLength(value)}))}]};
    const manifestPath = resolve(directory,'lock.json'), manifestBytes = JSON.stringify(manifest);
    await writeFile(manifestPath,manifestBytes);
    const args = {manifest:manifestPath,manifestSha256:sha(manifestBytes),archive,destination:resolve(directory,'installed')};
    await assert.rejects(installWebRuntime({...args,manifestSha256:'f'.repeat(64)}),/lock mismatch/);
    assert.equal((await installWebRuntime(args)).status,'installed-verified');
    await assert.rejects(installWebRuntime(args),/already exists/);
    await writeFile(archive,Buffer.concat([archiveBytes,Buffer.from('tampered')]));
    await assert.rejects(installWebRuntime({...args,destination:resolve(directory,'other')}));
    assert.throws(()=>selectWebArtifact({...manifest,distributionProfile:'full'}));
    assert.throws(()=>selectWebArtifact({...manifest,artifacts:[{...manifest.artifacts[0],files:[...manifest.artifacts[0].files,{path:'../private',sha256:policy,size:1}]}]}));
  } finally { await rm(directory,{recursive:true,force:true}); }
});
test('release staging detects missing and external module dependencies',async () => {
  await assert.rejects(verifyModuleClosure(new Map([['entry.mjs',Buffer.from("import './private.mjs';")]])),/Missing module/);
  await assert.rejects(verifyModuleClosure(new Map([['entry.mjs',Buffer.from("import 'https://untrusted.invalid/module.js';")]])),/External module/);
  await verifyModuleClosure(new Map([['entry.mjs',Buffer.from("import './worker.mjs';")],['worker.mjs',Buffer.from('export const ready=true;')]]));
});
