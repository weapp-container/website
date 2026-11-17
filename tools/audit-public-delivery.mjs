import assert from 'node:assert/strict';
import {readFile,readdir,lstat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyModuleClosure} from './stage-web-runtime.mjs';
import {verifyFrontendNotices} from './frontend-notices.mjs';
import {verifyPhotoNotices} from './photo-notices.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))).map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
const json=value=>JSON.stringify(value,null,2)+'\n';
const byteRules=[
  ['github-token',/(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{70,255})/g],
  ['aws-access-key',/(?:AKIA|ASIA)[A-Z0-9]{16}/g],
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['openai-key',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,255}/g],
  ['google-api-key',/AIza[0-9A-Za-z_-]{35}/g],
  ['assigned-secret',/["']?\b(?:CLOUDFLARE_API_TOKEN|CF_API_TOKEN|GITHUB_TOKEN|OPENAI_API_KEY|AWS_SECRET_ACCESS_KEY)\b["']?\s*[:=]\s*["'][^"'\r\n]{16,}/gi],
  ['credential-url',/https?:\/\/[^\s/@:"']+:[^\s/@"']+@/g],
  ['mac-private-path',/(?<![A-Za-z0-9_./-])\/Users\/[^\x00\r\n\s"'<>]{1,160}/g],
  ['linux-private-path',/(?<![A-Za-z0-9_./-])\/home\/[^\x00\r\n\s"'<>]{1,160}/g],
  ['windows-private-path',/[A-Z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)[^\x00\r\n\s"'<>]{1,160}/g],
  ['source-map-reference',/sourceMappingURL\s*=/g],
];
// Findings contain offsets and rule names only. Never print credential bytes.
export function scanPublicBytes(path,bytes){
  const text=bytes.toString('latin1'),findings=[],exceptions=[];
  for(const [rule,pattern] of byteRules){
    pattern.lastIndex=0;
    for(const match of text.matchAll(pattern)){
      const item={path,rule,offset:match.index};
      if(rule==='linux-private-path'&&/\/vendor\/canvaskit\/canvaskit\.js$/.test(path)&&match[0]==='/home/web_user')exceptions.push({...item,reason:'Pinned CanvasKit Emscripten virtual filesystem default; not a host account path'});
      else findings.push(item);
    }
  }
  return {findings,exceptions};
}
export function wasmCustomSections(bytes){
  assert.ok(bytes.subarray(0,8).equals(Buffer.from([0,97,115,109,1,0,0,0])),'Invalid WebAssembly header');
  let offset=8;const names=[];
  const leb=()=>{let value=0,shift=0;for(let count=0;count<5;count++){assert.ok(offset<bytes.length);const next=bytes[offset++];value+=(next&127)*2**shift;if(next<128)return value;shift+=7;}throw Error('Invalid WebAssembly section length');};
  while(offset<bytes.length){const kind=bytes[offset++],length=leb(),end=offset+length;assert.ok(end<=bytes.length);if(kind===0){const size=leb();assert.ok(offset+size<=end);names.push(bytes.subarray(offset,offset+size).toString('utf8'));}offset=end;}
  return names;
}
async function walk(directory){
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,entry.name),stat=await lstat(path);assert.ok(!stat.isSymbolicLink(),'Public symlink: '+path);if(stat.isDirectory())files.push(...await walk(path));else{assert.ok(stat.isFile());files.push(path);}}
  return files;
}
const licensePath=path=>path==='RUNTIME-LICENSE'||path.startsWith('licenses/')||path==='vendor/canvaskit/LICENSE'||path==='vendor/fonts/OFL.txt';
function git(args){const result=spawnSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:32*1024*1024});assert.equal(result.status,0,'Git baseline read failed: '+(result.error?.code??result.status));return result.stdout.trim();}
export async function auditPublicDelivery({site=resolve(root,'dist'),runtimeDirectory,baseline='HEAD',allowedSdkChanges=[],reportPath}={}){
  assert.ok(runtimeDirectory,'An explicit private runtime directory is required');
  const base=resolve(site),config=JSON.parse(await readFile(resolve(base,'showcase-runtime.json'),'utf8')),runtime=resolve(base,'runtime',config.deploymentHash);
  const report={schemaVersion:1,status:'running',scope:'Static public bytes, closure, receipt/license hashes and SDK lock preservation; no browser or legal-approval claim',deploymentHash:config.deploymentHash,packRoot:config.packRoot,policySha256:config.policySha256,findings:[],exceptions:[]};
  try{
    const allFiles=await walk(base),files=new Map();let totalBytes=0;
    for(const path of allFiles){
      const name=relative(base,path).split(sep).join('/'),bytes=await readFile(path);files.set(name,bytes);totalBytes+=bytes.length;
      assert.ok(!/(^|\/)(?:source|sources|source-snapshot|commands|raw|validation|cargo-target|target|project|node_modules|\.git|\.runtime|\.cache|\.astro|\.gradle|\.dart_tool|\.build|build|DerivedData|private-staging|build-cache|[^/]+\.(?:dSYM|xcarchive))(?:\/|$)/i.test(name),'Private directory: '+name);
      assert.ok(!/\.(?:map|rs|c|h|cc|cpp|swift|m|mm|dart|ets|ts|tsx|vue|pdb|dSYM|p12|pfx|jks|keystore|o|a|rlib|rmeta|gcda|gcno|profraw|profdata|log|tar|gz|zip)$/.test(name),'Private source/debug/archive asset: '+name);
      assert.ok(!/(?:^|\/)(?:SOURCES\.json|Cargo\.(?:toml|lock)|pnpm-lock\.yaml|\.env(?:\.[^/]+)?)$/.test(name),'Private build input: '+name);
      const scanned=scanPublicBytes(name,bytes);report.findings.push(...scanned.findings);report.exceptions.push(...scanned.exceptions);
    }
    assert.equal(report.findings.length,0,'Public credential/path/source-map scan found '+report.findings.length+' redacted finding(s)');
    const inventory=JSON.parse(await readFile(resolve(runtime,'deployment-inventory.json'),'utf8'));
    assert.equal(sha(json(inventory.files)),config.deploymentHash,'Deployment directory is not its inventory hash');
    const runtimeFiles=new Map();
    for(const descriptor of inventory.files){const bytes=await readFile(resolve(runtime,descriptor.path));assert.equal(bytes.length,descriptor.size);assert.equal(sha(bytes),descriptor.sha256);runtimeFiles.set(descriptor.path,bytes);}
    assert.deepEqual((await walk(runtime)).map(path=>relative(runtime,path).split(sep).join('/')).sort(),[...inventory.files.map(file=>file.path),'deployment-inventory.json'].sort());
    assert.deepEqual((await readdir(resolve(base,'runtime'))).sort(),[config.deploymentHash],'An unselected runtime remains in public delivery');
    await verifyModuleClosure(runtimeFiles);
    await verifyModuleClosure(new Map([...files].filter(([path])=>!path.startsWith('runtime/'))));
    const localReferences=[];
    const checkAsset=async(importer,url)=>{
      if(!url||url.startsWith('#')||/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url))return;
      const pathname=decodeURIComponent(url.split(/[?#]/)[0]);if(!pathname)return;
      let target=pathname.startsWith('/')?resolve(base,'.'+pathname):resolve(base,dirname(importer),pathname);
      assert.ok(target===base||target.startsWith(base+sep),'Asset escaped public root');
      if(pathname.endsWith('/'))target=resolve(target,'index.html');
      assert.ok((await lstat(target)).isFile(),'Missing local asset: '+importer+' -> '+pathname);localReferences.push({importer,target:relative(base,target)});
    };
    for(const [path,bytes] of files){
      if(path.endsWith('.html'))for(const match of bytes.toString('utf8').matchAll(/(?:src|href)=["']([^"']+)["']/g))await checkAsset(path,match[1]);
      if(path.endsWith('.css'))for(const match of bytes.toString('utf8').matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g))await checkAsset(path,match[1]??match[2]??match[3]);
    }
    const index=JSON.parse(runtimeFiles.get('pack-index.json')),manifest=JSON.parse(runtimeFiles.get(index.manifest)),unsigned=structuredClone(manifest);unsigned.integrity.root='';
    assert.equal(sha(canonical(unsigned)),config.packRoot,'Manifest canonical content root mismatch');
    assert.equal(index.integrityRoot,config.packRoot);assert.equal(sha(runtimeFiles.get(index.manifest)),index.manifestSha256);
    for(const blob of index.blobs){const bytes=runtimeFiles.get(blob.url);assert.ok(bytes);assert.equal(bytes.length,blob.size);assert.equal(sha(bytes),blob.sha256);}
    const receiptBytes=await readFile(resolve(runtimeDirectory,'release-receipt.json')),receipt=JSON.parse(receiptBytes),pin=JSON.parse(await readFile(resolve(root,'platforms/web-runtime.pin.json'),'utf8'));
    assert.equal(sha(receiptBytes),pin.receiptSha256,'Private producer receipt is not the repository pin');
    assert.equal(receipt.distributionProfile,'restricted-showcase');assert.equal(receipt.policySha256,config.policySha256);assert.equal(pin.packRoot,config.packRoot);
    const receipts=new Map(receipt.files.map(file=>[file.path,file])),licenseFiles=[];
    for(const [path,bytes] of runtimeFiles)if(licensePath(path)){const descriptor=receipts.get(path);assert.ok(descriptor,'License missing from producer receipt: '+path);assert.equal(sha(bytes),descriptor.sha256);licenseFiles.push(path);}
    assert.deepEqual(licenseFiles.sort(),receipt.files.filter(file=>licensePath(file.path)).map(file=>file.path).sort(),'Producer license omitted from public closure');
    const frontendLicenses=await verifyFrontendNotices(base),photos=await verifyPhotoNotices(base);
    const licenses=JSON.parse(runtimeFiles.get('licenses/licenses.json'));let licenseReferences=0;
    for(const item of licenses.packages){assert.ok(item.license&&item.files.length);for(const file of item.files){assert.equal(sha(runtimeFiles.get('licenses/'+file.path)),file.sha256,'Collector license hash mismatch');licenseReferences++;}}
    const wasm=[];
    for(const [path,bytes] of runtimeFiles)if(path.endsWith('.wasm')){const sections=wasmCustomSections(bytes);assert.ok(!sections.some(name=>/^\.debug|sourceMappingURL|external_debug_info/.test(name)),'WebAssembly debug section: '+path);if(path.startsWith('pkg/')){assert.ok(!sections.includes('name'),'Private WASM symbols remain');assert.ok(bytes.includes(Buffer.from(`weapp-container-distribution:restricted-showcase:${config.policySha256}\0`)));}wasm.push({path,sha256:sha(bytes),customSections:sections});}
    const baselineCommit=git(['rev-parse',baseline]),oldLock=JSON.parse(git(['show',baselineCommit+':platforms/sdk-artifacts.lock.json'])),newLock=JSON.parse(await readFile(resolve(root,'platforms/sdk-artifacts.lock.json'),'utf8'));
    const oldEntries=new Map(oldLock.artifacts.map(item=>[item.id,item])),newEntries=new Map(newLock.artifacts.map(item=>[item.id,item])),sdk={baselineCommit,unchanged:[],modified:[],added:[],removed:[]};
    for(const [id,value] of oldEntries){if(!newEntries.has(id))sdk.removed.push(id);else if(canonical(value)===canonical(newEntries.get(id)))sdk.unchanged.push(id);else sdk.modified.push(id);}
    for(const id of newEntries.keys())if(!oldEntries.has(id))sdk.added.push(id);
    assert.deepEqual(sdk.removed,[],'Existing SDK entry removed');
    for(const id of [...sdk.modified,...sdk.added])assert.ok(allowedSdkChanges.includes(id),'Unapproved SDK entry changed: '+id);
    const withoutEntries=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='artifacts'));assert.deepEqual(withoutEntries(oldLock),withoutEntries(newLock),'SDK lock top-level identity changed');
    assert.equal(JSON.parse(await readFile(resolve(base,'showcase-runtime.json'),'utf8')).deploymentHash,config.deploymentHash,'Public delivery changed during audit');
    Object.assign(report,{status:'passed',files:files.size,bytes:totalBytes,closure:{inventoryFiles:inventory.files.length,packBlobs:index.blobs.length,localHtmlCssReferences:localReferences.length,moduleImports:'verified'},licenses:{files:licenseFiles.length,packages:licenses.packages.length,packageFileReferences:licenseReferences,receiptSha256:sha(receiptBytes),frontend:frontendLicenses,photos},wasm,sdk,limitations:['Pattern scanning cannot prove absence of every possible secret encoding.','License completeness and hashes are verified; this is not legal approval.','Published minified loaders and obfuscated client business bytes remain inspectable.','No browser, GPU, native installation or online deployment validation is performed.']});
    return report;
  }catch(error){report.status='failed';report.error=error.message;throw Object.assign(error,{auditReport:report});}
  finally{if(reportPath){await mkdir(dirname(resolve(reportPath)),{recursive:true});await writeFile(resolve(reportPath),json(report));}}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const options={},args=process.argv.slice(2);for(let index=0;index<args.length;index+=2){assert.ok(['--site','--runtime','--baseline','--allowed-sdk-changes','--report'].includes(args[index])&&args[index+1]&&!options[args[index]]);options[args[index]]=args[index+1];}
  auditPublicDelivery({site:options['--site'],runtimeDirectory:options['--runtime'],baseline:options['--baseline'],allowedSdkChanges:(options['--allowed-sdk-changes']||'').split(',').filter(Boolean),reportPath:options['--report']}).then(report=>console.log(json(report))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
