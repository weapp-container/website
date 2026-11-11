#!/usr/bin/env node
import {cp,mkdir,readFile,writeFile,readdir,lstat,realpath,rm,rename} from 'node:fs/promises'
import {createHash,randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {resolve,dirname,basename,join,relative,sep} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'

export const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const requireValue=(value,message)=>{if(!value)throw Error(message)}
const json=value=>JSON.stringify(value,null,2)+'\n'
export async function inventory(root) {
  const files=[];let totalBytes=0
  async function walk(dir){
    for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
      const path=join(dir,entry.name),stat=await lstat(path)
      requireValue(!stat.isSymbolicLink(),'Toolchain symlinks are not permitted: '+relative(root,path))
      if(stat.isDirectory())await walk(path)
      else {requireValue(stat.isFile()&&stat.size<=64*1024*1024,'Invalid toolchain file: '+path);totalBytes+=stat.size;requireValue(totalBytes<=256*1024*1024,'Toolchain exceeds 256 MiB budget');const bytes=await readFile(path);files.push({path:relative(root,path).split(sep).join('/'),size:bytes.length,sha256:sha(bytes)})}
      requireValue(files.length<=12000,'Toolchain file count exceeds budget')
    }
  }
  await walk(root);return files.sort((a,b)=>a.path.localeCompare(b.path))
}
function git(core,args){const result=spawnSync('git',['-C',core,...args],{encoding:'utf8',maxBuffer:32*1024*1024});requireValue(result.status===0,'Git source export failed: '+result.stderr);return result.stdout}
async function packageRoot(name,from){
  const require=createRequire(pathToFileURL(join(from,'package.json')))
  let location
  try{location=require.resolve(name+'/package.json')}catch{location=require.resolve(name)}
  let cursor=dirname(location)
  while(cursor!==dirname(cursor)){
    try{const value=JSON.parse(await readFile(join(cursor,'package.json'),'utf8'));if(value.name===name)return {root:await realpath(cursor),value}}catch{}
    cursor=dirname(cursor)
  }
  throw Error('Cannot locate dependency manifest: '+name)
}
export async function exportToolchain({core,commit,dependencyRoot,out,archive}={}) {
  requireValue(core&&out,'--core and --out are required')
  core=await realpath(resolve(core));out=resolve(out);dependencyRoot=await realpath(resolve(dependencyRoot||join(core,'tools/container-manifest')))
  requireValue(!out.startsWith(core+sep)&&out!==core,'Toolchain output must be outside the private source checkout')
  try{await lstat(out);throw Error('Toolchain output already exists: '+out)}catch(error){if(error.code!=='ENOENT')throw error}
  try{await lstat(out+'.lock.json');throw Error('Toolchain lock already exists: '+out+'.lock.json')}catch(error){if(error.code!=='ENOENT')throw error}
  const sourceCommit=git(core,['rev-parse',commit||'HEAD']).trim()
  requireValue(/^[a-f0-9]{40}$/.test(sourceCommit),'Export requires an exact Git commit')
  const paths=git(core,['ls-tree','-r','--name-only',sourceCommit,'--','tools/container-manifest/src','tools/container-manifest/bin','tools/container-manifest/package.json']).trim().split('\n').filter(Boolean)
  requireValue(paths.length>5&&paths.every(path=>/^tools\/container-manifest\/(?:src\/.+\.mjs|bin\/.+\.mjs|package\.json)$/.test(path)),'Unexpected packer source closure')
  await mkdir(dirname(out),{recursive:true});const stage=join(dirname(out),'.toolchain-'+randomUUID());await mkdir(stage)
  let published=false
  try{
    const sourceFiles=[]
    for(const path of paths){
      const bytes=Buffer.from(git(core,['show',sourceCommit+':'+path]));const destination=join(stage,path.slice('tools/container-manifest/'.length));await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes,{flag:'wx'});sourceFiles.push({path,sha256:sha(bytes),size:bytes.length})
    }
    const license=Buffer.from(git(core,['show',sourceCommit+':LICENSE-PROPRIETARY']));await writeFile(join(stage,'TOOL-LICENSE'),license,{flag:'wx'})
    const manifest=JSON.parse(await readFile(join(stage,'package.json'),'utf8')),dependencies=[],seen=new Map(),missingOptional=[]
    async function vendor(name,from,optional=false){
      let pkg
      try{pkg=await packageRoot(name,from)}catch(error){if(optional){missingOptional.push(name);return}throw error}
      if(seen.has(name)){requireValue(seen.get(name)===pkg.value.version,'Conflicting dependency versions require nested export: '+name);return}
      seen.set(name,pkg.value.version);dependencies.push({name,version:pkg.value.version})
      const target=join(stage,'node_modules',name);await mkdir(dirname(target),{recursive:true})
      await cp(pkg.root,target,{recursive:true,dereference:false,filter:source=>{const parts=relative(pkg.root,source).split(sep);return !parts.includes('node_modules')&&!parts.includes('.git')}})
      const optionalNames=new Set(Object.keys(pkg.value.optionalDependencies||{}))
      for(const dependency of Object.keys({...pkg.value.dependencies,...pkg.value.optionalDependencies}).sort())await vendor(dependency,pkg.root,optionalNames.has(dependency))
    }
    for(const name of Object.keys(manifest.dependencies||{}).sort())await vendor(name,dependencyRoot)
    const files=await inventory(stage)
    const receipt={schemaVersion:1,kind:'private-showcase-packer-toolchain',sourceCommit,packer:manifest.name,packerVersion:manifest.version||'source',nodeVersion:process.version,sourceFiles,dependencies:dependencies.sort((a,b)=>a.name.localeCompare(b.name)),missingOptional:missingOptional.sort(),files,scope:'Private native-format packer and installed dependencies only. No runtime, compiler, renderer, Git history, or credentials. Native sample input is not a weapp-vite compilation.'}
    const receiptBytes=Buffer.from(json(receipt));await writeFile(join(stage,'toolchain.json'),receiptBytes,{flag:'wx'})
    // A successful packer import proves that the relocated dependency closure resolves.
    const check=spawnSync(process.execPath,['--input-type=module','-e','await import('+JSON.stringify(pathToFileURL(join(stage,'src/index.mjs')).href)+')'],{encoding:'utf8'})
    requireValue(check.status===0,'Relocated packer import failed: '+check.stderr)
    await rename(stage,out);published=true
    const lock={schemaVersion:1,kind:receipt.kind,sourceCommit,receiptSha256:sha(receiptBytes)}
    if(archive){
      archive=resolve(archive);await mkdir(dirname(archive),{recursive:true})
      const program=`import gzip,tarfile,sys,pathlib\nr=pathlib.Path(sys.argv[1])\nwith open(sys.argv[2],'xb') as out:\n with gzip.GzipFile(fileobj=out,mode='wb',mtime=0,filename='') as gz:\n  with tarfile.open(fileobj=gz,mode='w') as tar:\n   for p in sorted(r.rglob('*')):\n    if p.is_file():\n     b=p.read_bytes();i=tarfile.TarInfo(p.relative_to(r).as_posix());i.size=len(b);i.mode=0o644;i.mtime=0\n     import io\n     tar.addfile(i,io.BytesIO(b))`
      const result=spawnSync('python3',['-c',program,out,archive],{encoding:'utf8'});requireValue(result.status===0,'Toolchain archive failed: '+result.stderr)
      const bytes=await readFile(archive);lock.archive={fileName:basename(archive),size:bytes.length,sha256:sha(bytes)}
    }
    const lockPath=out+'.lock.json';await writeFile(lockPath,json(lock),{flag:'wx'})
    return {directory:out,lockPath,...lock,files:files.length}
  }finally{if(!published)await rm(stage,{recursive:true,force:true})}
}
export function parseArguments(args){const result={};for(let index=0;index<args.length;index++){const key={'--core':'core','--commit':'commit','--dependency-root':'dependencyRoot','--out':'out','--archive':'archive'}[args[index]];requireValue(key&&args[index+1]&&!args[index+1].startsWith('--'),'Unknown or incomplete option: '+args[index]);requireValue(!result[key],'Duplicate option: '+args[index]);result[key]=args[++index]}return result}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))exportToolchain(parseArguments(process.argv.slice(2))).then(value=>console.log(json(value))).catch(error=>{console.error(error.message);process.exitCode=1})
