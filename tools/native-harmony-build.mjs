import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, VERSION, run, verifyInstallation } from './sdk-install.mjs';
import { syncPack } from './native-sync-pack.mjs';
import { stageDelivery } from './native-delivery.mjs';
const output = resolve(ROOT,'artifacts/harmony'); await mkdir(output,{recursive:true});
const receipt = {schemaVersion:1,version:VERSION,platform:'harmony',profile:'restricted-showcase',build:'running',execution:'not-run',signing:'unsigned',startedAt:new Date().toISOString()};
try {
  const sdk = resolve(ROOT,'.runtime/sdk/harmony'), installation = await verifyInstallation(sdk,'harmony');
  const pack = await syncPack(undefined,{family:'harmony'}); assert.equal(pack.packRoot,installation.binding.packRoot);
  receipt.packRoot=pack.packRoot; receipt.sdkArchiveSha256=installation.archiveSha256;
  const cwd=resolve(ROOT,'hosts/harmony'), libs=resolve(cwd,'entry/libs');
  await rm(libs,{recursive:true,force:true}); await cp(resolve(sdk,'libs'),libs,{recursive:true});
  for(const library of ['libentry.so','libcontainer_host_harmony.so']) assert.ok((await stat(resolve(libs,'arm64-v8a',library))).isFile());
  const deveco=process.env.DEVECO_HOME || '/Applications/DevEco-Studio.app/Contents';
  const official=process.env.OHOS_SDK || resolve(deveco,'sdk/default/openharmony');
  const hvigor=process.env.HVIGOR || resolve(deveco,'tools/hvigor/bin/hvigorw');
  const ohpm=process.env.OHPM || resolve(deveco,'tools/ohpm/bin/ohpm');
  assert.ok((await stat(hvigor)).isFile(),'The official DevEco/Hvigor toolchain must be installed');
  const versioned=resolve(ROOT,'.private/harmony-sdk'), version=resolve(versioned,'24');await mkdir(version,{recursive:true});
  for(const component of ['ets','js','native','previewer','toolchains']) {
    const target=resolve(version,component);try {await stat(target);} catch(error) {if(error.code!=='ENOENT')throw error;await symlink(resolve(official,component),target,'dir');}
  }
  await run(ohpm,['install'],{cwd});
  await run(ohpm,['install'],{cwd:resolve(cwd,'entry')});
  await run(hvigor,['assembleApp','-p','product=default','-p','buildMode=release','--no-daemon'],{cwd,env:{...process.env,OHOS_BASE_SDK_HOME:versioned}});
  const hap=resolve(cwd,'entry/build/default/outputs/default/entry-default-unsigned.hap');
  const expected=installation.files.filter(file=>/^libs\/arm64-v8a\/.+\.so$/.test(file.path));
  assert.ok(expected.length>=2);
  receipt.nativeFiles=JSON.parse(await run(process.env.PYTHON || 'python3',['-c',`import hashlib,json,sys,zipfile
expected=json.loads(sys.argv[2]);report=[]
with zipfile.ZipFile(sys.argv[1]) as archive:
 for file in expected:
  if archive.namelist().count(file['path'])!=1:raise ValueError('Missing or duplicate native HAP library')
  data=archive.read(file['path'])
  if len(data)!=file['size'] or hashlib.sha256(data).hexdigest()!=file['sha256']:raise ValueError('HAP modified the reviewed native library')
  report.append(file)
 if not any(name.endswith('modules.abc') for name in archive.namelist()):raise ValueError('HAP lacks compiled ArkTS bytecode')
print(json.dumps(report))`,hap,JSON.stringify(expected)]));
  receipt.delivery=await stageDelivery('harmony','harmony',hap);receipt.build='passed';
} catch(error) {receipt.build='failed';receipt.error=error.message;process.exitCode=1;}
receipt.finishedAt=new Date().toISOString();await writeFile(resolve(output,'build.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
