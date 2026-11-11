import assert from 'node:assert/strict';
import {readFile,readdir,realpath,lstat,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),lockPath=resolve(root,'website/frontend-licenses.lock.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),json=value=>JSON.stringify(value,null,2)+'\n';
const reviewed=[
  ['astro'],['@astrojs/react'],['react'],['react-dom'],['scheduler','react-dom'],['@phosphor-icons/react'],['vite','astro'],['rolldown','astro'],
  ['@base-ui/react'],['@base-ui/utils','@base-ui/react'],['@babel/runtime','@base-ui/react'],
  ['@floating-ui/react-dom','@base-ui/react'],['@floating-ui/dom','@floating-ui/react-dom'],['@floating-ui/core','@floating-ui/dom'],['@floating-ui/utils','@base-ui/react'],
  ['reselect','@base-ui/utils'],['use-sync-external-store','@base-ui/react'],
];
const reviewedFrom=new Map(reviewed.map(([name,from])=>[name,from]));
const packagePath=(name,version)=>name.replace(/^@/,'').replaceAll('/','--')+'-'+version;
async function installed(name,from){
  const require=createRequire(from?await packageFile(from):resolve(root,'package.json'));
  return realpath(require.resolve(name+'/package.json'));
}
const packageFile=name=>installed(name,reviewedFrom.get(name));
async function collectReviewed(){
  const packages=[];
  for(const [name,from]of reviewed){
    const path=await installed(name,from),bytes=await readFile(path),metadata=JSON.parse(bytes),directory=dirname(path),files=[];
    for(const file of (await readdir(directory)).sort())if(/^(?:licen[cs]e|copying|notice)(?:\.[^/]*)?$/i.test(file)){
      const source=resolve(directory,file),stat=await lstat(source);assert.ok(stat.isFile()&&!stat.isSymbolicLink());const content=await readFile(source);
      files.push({path:packagePath(name,metadata.version)+'/'+file,size:content.length,sha256:sha(content)});
    }
    assert.ok(metadata.license&&files.length,'Missing complete license files for '+name);
    packages.push({name,version:metadata.version,license:metadata.license,packageJsonSha256:sha(bytes),files});
  }
  return packages.sort((a,b)=>a.name.localeCompare(b.name));
}
export async function refreshFrontendLicenseLock(){
  const lock={schemaVersion:1,kind:'showcase-frontend-license-lock',packageLockSha256:sha(await readFile(resolve(root,'pnpm-lock.yaml'))),scope:'Reviewed conservative package set; each production client chunk is checked against it during generateBundle. Vite and Rolldown are retained for generated runtime helpers.',packages:await collectReviewed()};
  await writeFile(lockPath,json(lock));return lock;
}
async function verifiedPackages(){
  const bytes=await readFile(lockPath),lock=JSON.parse(bytes);
  assert.equal(lock.packageLockSha256,sha(await readFile(resolve(root,'pnpm-lock.yaml'))),'Refresh frontend licenses after reviewing dependency lock changes');
  assert.deepEqual(await collectReviewed(),lock.packages,'Resolved frontend licenses differ from their reviewed lock');
  const resolved=new Map();for(const [name,from]of reviewed)resolved.set(name,dirname(await installed(name,from)));
  return {lock,bytes,resolved};
}
export function frontendNoticesPlugin({proofPath=resolve(root,'artifacts/private/duo-adaptation/frontend-build-module-proof.json')}={}){
  const directoryCache=new Map();
  const owner=async id=>{
    let directory=dirname(id.split('?')[0]);const visited=[];
    while(directory!==dirname(directory)){
      if(directoryCache.has(directory)){const value=directoryCache.get(directory);for(const item of visited)directoryCache.set(item,value);return value;}
      visited.push(directory);
      try{const path=resolve(directory,'package.json'),metadata=JSON.parse(await readFile(path,'utf8'));if(metadata.name){const value={name:metadata.name,version:metadata.version,directory:await realpath(directory)};for(const item of visited)directoryCache.set(item,value);return value;}}
      catch(error){if(!['ENOENT','ENOTDIR'].includes(error.code))throw error;}
      directory=dirname(directory);
    }
    return null;
  };
  return {
    name:'showcase-frontend-notices',apply:'build',enforce:'post',
    applyToEnvironment(environment){return environment.config.consumer==='client';},
    async generateBundle(_options,bundle){
      if(this.environment&&this.environment.config.consumer!=='client')return;
      const {lock,bytes,resolved}=await verifiedPackages(),traced=new Map(),virtual=[];
      for(const chunk of Object.values(bundle))if(chunk.type==='chunk')for(const [id,module]of Object.entries(chunk.modules)){
        if(id.startsWith('\0')){assert.equal(id,'\0rolldown/runtime.js','Review license ownership for a new virtual client runtime module');virtual.push({chunk:chunk.fileName,id,licensePackage:'rolldown'});continue;}
        if(!id.includes('/node_modules/'))continue;
        const info=await owner(id);assert.ok(info,'Unidentified bundled npm module');
        const reviewed=lock.packages.find(item=>item.name===info.name&&item.version===info.version);
        assert.ok(reviewed&&resolved.get(info.name)===info.directory,'Unreviewed bundled frontend dependency: '+info.name+'@'+info.version);
        const record=traced.get(info.name)||{modules:new Set(),renderedModules:new Set(),chunks:new Set()};record.modules.add(relative(info.directory,id.split('?')[0]));record.chunks.add(chunk.fileName);if(module.renderedLength>0)record.renderedModules.add(id);traced.set(info.name,record);
      }
      const packages=[];
      for(const item of lock.packages){
        const trace=traced.get(item.name);
        for(const file of item.files){const source=await readFile(resolve(resolved.get(item.name),file.path.slice(file.path.indexOf('/')+1)));assert.equal(sha(source),file.sha256);this.emitFile({type:'asset',fileName:'licenses/frontend/'+file.path,source});}
        packages.push({...item,evidence:{scope:trace?'production-client-chunk-modules':'conservative-runtime-helper-notice',moduleCount:trace?.modules.size||0,renderedModuleCount:trace?.renderedModules.size||0,chunks:[...(trace?.chunks||[])].sort()}});
      }
      const inventory={schemaVersion:1,kind:'showcase-frontend-notices',sourceLockSha256:sha(bytes),packageLockSha256:lock.packageLockSha256,collection:'Production client generateBundle chunk.modules, including zero-rendered traced modules; reviewed conservative helpers included. Build-only dependency trees are not claimed as bundled.',packages};
      this.emitFile({type:'asset',fileName:'licenses/frontend/notices.json',source:json(inventory)});
      const proof={schemaVersion:1,sourceLockSha256:sha(bytes),packages:[...traced].map(([name,item])=>({name,modules:[...item.modules].sort(),chunks:[...item.chunks].sort()})),virtual};
      await mkdir(dirname(proofPath),{recursive:true});await writeFile(proofPath,json(proof));
    },
  };
}
export async function verifyFrontendNotices(site){
  const {lock,bytes}=await verifiedPackages(),base=resolve(site,'licenses/frontend'),inventory=JSON.parse(await readFile(resolve(base,'notices.json'),'utf8'));
  assert.equal(inventory.sourceLockSha256,sha(bytes));assert.equal(inventory.packageLockSha256,lock.packageLockSha256);
  assert.deepEqual(inventory.packages.map(({evidence,...item})=>item),lock.packages,'Public frontend license inventory differs from the reviewed versions');
  const expected=['notices.json'];
  for(const item of inventory.packages){assert.ok(item.evidence&&Number.isSafeInteger(item.evidence.moduleCount));for(const file of item.files){assert.ok(!file.path.includes('..')&&!file.path.startsWith('/'));const content=await readFile(resolve(base,file.path));assert.equal(content.length,file.size);assert.equal(sha(content),file.sha256);expected.push(file.path);}}
  const actual=[];const walk=async(directory)=>{for(const entry of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,entry.name),stat=await lstat(path);assert.ok(!stat.isSymbolicLink());if(stat.isDirectory())await walk(path);else{assert.ok(stat.isFile());actual.push(relative(base,path).split(sep).join('/'));}}};await walk(base);assert.deepEqual(actual.sort(),expected.sort(),'Unreviewed frontend license asset');
  return {packages:inventory.packages.length,licenseFiles:expected.length-1,sourceLockSha256:sha(bytes)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.deepEqual(process.argv.slice(2),['--refresh-lock']);console.log(json(await refreshFrontendLicenseLock()));
}
