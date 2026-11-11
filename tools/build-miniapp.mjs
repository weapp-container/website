#!/usr/bin/env node
import {readFile,writeFile,mkdir,readdir,lstat,rm,rename} from 'node:fs/promises'
import {resolve,dirname,join,relative,sep} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createRequire} from 'node:module'
import {randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {inventory,sha} from './export-toolchain.mjs'
import {parse} from 'acorn'
import {posix} from 'node:path'
import {create as createFont} from 'fontkit'

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)))
const requireValue=(value,message)=>{if(!value)throw Error(message)}
const json=value=>JSON.stringify(value,null,2)+'\n'
export const ALLOWED_APIS=Object.freeze(['weappContainer.offMessage','weappContainer.onMessage','weappContainer.postMessage','wx.getStorageSync','wx.getWindowInfo','wx.offHostLayoutChange','wx.onHostLayoutChange','wx.setStorageSync','wx.timer'].sort())
export const OBFUSCATION_SEED=20261105
export const OBFUSCATION_OPTIONS=Object.freeze({compact:true,controlFlowFlattening:false,deadCodeInjection:false,debugProtection:false,debugProtectionInterval:0,selfDefending:false,renameGlobals:false,renameProperties:false,identifierNamesGenerator:'hexadecimal',numbersToExpressions:false,simplify:true,splitStrings:false,stringArray:true,stringArrayEncoding:['base64'],stringArrayThreshold:0.75,stringArrayRotate:false,stringArrayShuffle:false,stringArrayCallsTransform:false,stringArrayWrappersCount:1,transformObjectKeys:false,unicodeEscapeSequence:false,target:'browser-no-eval',sourceMap:false,seed:OBFUSCATION_SEED})
export const MINIFY_OPTIONS=Object.freeze({compress:{passes:2,unsafe:false},mangle:{toplevel:false,properties:false,reserved:['App','Page','Component','Behavior','getApp','getCurrentPages','wx','weappContainer','module','exports','require']},format:{comments:false,ascii_only:false},sourceMap:false,module:false})
export const SHOWCASE_FONT_SHA256='916bd5146cd1099aff18931fd0c85f4f3fd1ff7b2c966cb3cc22a4e5a6216983'
export function fontCoverageModule(font){
  const ranges=[]
  for(const codepoint of [...font.characterSet].sort((a,b)=>a-b)){
    const previous=ranges[ranges.length-1]
    if(previous&&previous[1]+1===codepoint)previous[1]=codepoint
    else ranges.push([codepoint,codepoint])
  }
  return '// Generated from reviewed Noto Sans SC '+SHOWCASE_FONT_SHA256+'\nmodule.exports='+JSON.stringify(ranges)+';\n'
}
export async function verifyGlyphCoverage(sources,fontFile){
  requireValue(fontFile,'--font must select the reviewed Noto Sans SC binary')
  const bytes=await readFile(fontFile);requireValue(sha(bytes)===SHOWCASE_FONT_SHA256,'Showcase font differs from the renderer pin')
  const font=createFont(bytes),missing=new Map()
  requireValue(sources.find(source=>source.path==='lib/font-coverage.js')?.bytes.toString('utf8')===fontCoverageModule(font),'Regenerate lib/font-coverage.js from the reviewed font before packing')
  for(const source of sources)if(/\.(js|wxml)$/.test(source.path))for(const character of source.bytes.toString('utf8')){
    const codepoint=character.codePointAt(0)
    if(codepoint>32&&!font.hasGlyphForCodePoint(codepoint))missing.set(codepoint,source.path+' U+'+codepoint.toString(16).toUpperCase()+' '+character)
  }
  requireValue(missing.size===0,'Demo text is outside the accepted runtime font: '+[...missing.values()].join(', '))
  return {family:'Container Sans SC',sha256:SHOWCASE_FONT_SHA256,sourceGlyphsChecked:true}
}
export function moduleDependencies(source){
  const found=new Set(),ast=parse(source,{ecmaVersion:'latest',sourceType:'script'})
  function visit(node){
    if(!node||typeof node!=='object')return
    if(node.type==='CallExpression'&&node.callee?.type==='Identifier'&&node.callee.name==='require'){
      requireValue(node.arguments.length===1&&node.arguments[0].type==='Literal'&&typeof node.arguments[0].value==='string','Dynamic require is forbidden in the shared demo')
      const value=node.arguments[0].value
      requireValue(/^\.{1,2}\//.test(value)&&!/[\\\x00-\x20]/.test(value),'Only relative static module requests are allowed')
      found.add(value)
    }
    for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value)
  }
  visit(ast);return [...found].sort()
}
export function capabilityOverrides(defaults){return Object.fromEntries([...new Set([...Object.keys(defaults),...ALLOWED_APIS])].sort().map(name=>[name,ALLOWED_APIS.includes(name)?'partial':'unsupported']))}
export async function verifyToolchain(directory,lockPath=directory+'.lock.json'){
  const bytes=await readFile(join(directory,'toolchain.json')),lock=JSON.parse(await readFile(lockPath,'utf8')),receipt=JSON.parse(bytes)
  requireValue(lock.schemaVersion===1&&lock.kind==='private-showcase-packer-toolchain'&&sha(bytes)===lock.receiptSha256,'Private toolchain receipt pin mismatch')
  requireValue(receipt.kind===lock.kind&&receipt.schemaVersion===1&&receipt.sourceCommit===lock.sourceCommit&&Array.isArray(receipt.files),'Invalid private toolchain receipt')
  const files=(await inventory(directory)).filter(file=>file.path!=='toolchain.json')
  requireValue(JSON.stringify(files)===JSON.stringify(receipt.files),'Private toolchain file inventory differs from its pinned receipt')
  return {receipt,receiptSha256:sha(bytes)}
}
async function transformTools(){
  const require=createRequire(import.meta.url),terser=await import('terser'),obfuscator=await import('javascript-obfuscator')
  const versions={terser:JSON.parse(await readFile(require.resolve('terser/package.json'),'utf8')).version,obfuscator:JSON.parse(await readFile(require.resolve('javascript-obfuscator/package.json'),'utf8')).version}
  requireValue(versions.terser==='5.44.1'&&versions.obfuscator==='5.10.0','Exact reviewed Terser/obfuscator versions are required')
  return {minify:terser.minify,obfuscate:obfuscator.default.obfuscate,versions}
}
export async function transformJavaScript(source,tools){
  tools=tools||await transformTools()
  const minimized=await tools.minify(source,MINIFY_OPTIONS)
  requireValue(typeof minimized.code==='string'&&minimized.code.length>0,'Terser emitted an empty module')
  const dependencies=moduleDependencies(source),escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  const options={...OBFUSCATION_OPTIONS,reservedStrings:dependencies.map(value=>'^'+escape(value)+'$')}
  const output=tools.obfuscate(minimized.code,options).getObfuscatedCode()
  requireValue(JSON.stringify(moduleDependencies(output))===JSON.stringify(dependencies),'Obfuscation changed the static module dependency graph')
  requireValue(!/sourceMappingURL/.test(output),'Source map marker in protected module')
  return output+'\n'
}
export async function miniappSources(input){
  const files=[]
  async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name),stat=await lstat(path);requireValue(!stat.isSymbolicLink(),'Miniapp source symlink is forbidden: '+path);if(stat.isDirectory())await walk(path);else if(/\.(?:js|json|wxml|wxss|jpg|jpeg|png|webp|gif)$/.test(entry.name)&&!['package.json','project.config.json','SOURCES.json'].includes(entry.name)){requireValue(stat.isFile()&&stat.size<=16*1024*1024,'Invalid miniapp source');files.push({path:relative(input,path).split(sep).join('/'),bytes:await readFile(path)})}}}
  await walk(input)
  const required=['app.js','app.json','app.wxss','container.config.json','pages/home/index.js','pages/home/index.wxml',...['bottle','mug','headphones','bag','coffee','salad','pizza'].map(name=>'assets/'+name+'.jpg')]
  for(const path of required)requireValue(files.some(file=>file.path===path),'Required miniapp input is missing: '+path)
  return files.sort((a,b)=>a.path.localeCompare(b.path))
}
export async function buildMiniapp({toolchain=join(ROOT,'.runtime/tooling'),toolchainLock,input=join(ROOT,'miniapp'),out=join(ROOT,'artifacts/miniapp'),font}={}){
  toolchain=resolve(toolchain);input=resolve(input);out=resolve(out)
  requireValue(out!==input&&!out.startsWith(input+sep)&&!input.startsWith(out+sep),'Output must be separate from miniapp sources')
  try{await lstat(out);throw Error('Miniapp output already exists; choose a new build directory: '+out)}catch(error){if(error.code!=='ENOENT')throw error}
  const verified=await verifyToolchain(toolchain,toolchainLock),sources=await miniappSources(input),tools=await transformTools()
  const fontCoverage=await verifyGlyphCoverage(sources,font)
  await mkdir(dirname(out),{recursive:true});const stage=join(dirname(out),'.miniapp-'+randomUUID());await mkdir(stage)
  let published=false
  try{
    const immutable=join(stage,'private-staging');await mkdir(immutable)
    const sourceInventory=[],transformed=[],dependencies={}
    for(const file of sources){
      sourceInventory.push({path:file.path,size:file.bytes.length,sha256:sha(file.bytes)})
      if(file.path.endsWith('.js'))dependencies[file.path]=moduleDependencies(file.bytes.toString('utf8'))
      const output=file.path.endsWith('.js')?Buffer.from(await transformJavaScript(file.bytes.toString('utf8'),tools)):file.bytes
      const destination=join(immutable,file.path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,output,{flag:'wx',mode:0o444});transformed.push({path:file.path,size:output.length,sha256:sha(output)})
    }
    // Import only the explicit, pinned, relocated private toolchain.
    const packer=await import(pathToFileURL(join(toolchain,'src/index.mjs')).href)
    const capabilities=capabilityOverrides(packer.DEFAULT_CAPABILITIES)
    const result=await packer.packContainer(immutable,join(stage,'pack'),{project:immutable,platform:'weapp',compilerCommit:'authored-native-showcase:no-compiler-executed',capabilities})
    const manifest=JSON.parse(await readFile(join(stage,'pack/manifest.json'),'utf8')),root=manifest.integrity.root
    requireValue(/^[a-f0-9]{64}$/.test(root),'Packer did not produce a valid manifest integrity root')
    // Admission depends on the manifest graph as well as executable bytes.
    // Prove that every authored CommonJS edge survived transform and packing.
    for(const [path,requests] of Object.entries(dependencies)){
      const module=manifest.modules.find(value=>value.id==='module:'+path)
      requireValue(module,'Packed module is missing: '+path)
      const expected=requests.map(request=>'module:'+posix.normalize(posix.join(posix.dirname(path),request.endsWith('.js')?request:request+'.js'))).sort()
      const actual=[...(module.dependencies||[])].sort()
      requireValue(JSON.stringify(actual)===JSON.stringify(expected),'Packed dependency graph differs for '+path+': '+JSON.stringify({actual,expected}))
    }
    requireValue(Object.entries(manifest.capabilities).every(([name,status])=>status==='unsupported'||ALLOWED_APIS.includes(name)),'Manifest exposes an unreviewed capability')
    const diagnostic=JSON.parse(await readFile(join(stage,'pack/diagnostics.json'),'utf8'))
    requireValue(!result.diagnostics.some(item=>item.severity==='error'),'Packer reported errors')
    const stagedAgain=await inventory(immutable);requireValue(JSON.stringify(stagedAgain)===JSON.stringify(transformed),'Immutable transformed staging changed during packing')
    const currentSources=(await miniappSources(input)).map(file=>({path:file.path,size:file.bytes.length,sha256:sha(file.bytes)}))
    requireValue(JSON.stringify(currentSources)===JSON.stringify(sourceInventory),'Miniapp source changed while creating the frozen build')
    await verifyToolchain(toolchain,toolchainLock)
    const policy={schemaVersion:1,allowedPackRoots:[root],allowedApis:[...ALLOWED_APIS]}
    await writeFile(join(stage,'policy.json'),json(policy),{flag:'wx'})
    const sourceGit=spawnSync('git',['-C',ROOT,'rev-parse','HEAD'],{encoding:'utf8'}),sourceCommit=sourceGit.status===0?sourceGit.stdout.trim():null
    const receipt={schemaVersion:1,kind:'private-showcase-pack-build',source:{sourceCommit,inventory:sourceInventory,inventorySha256:sha(Buffer.from(json(sourceInventory))),binding:'Exact source inventory; a checkout commit alone does not bind uncommitted files'},inputFormat:'authored-native-wechat-miniapp',compilerExecuted:false,compilerMetadataLimitation:'The packer compiler.name is historical format metadata; no weapp-vite compiler was invoked.',toolchain:{sourceCommit:verified.receipt.sourceCommit,receiptSha256:verified.receiptSha256},transform:{versions:tools.versions,seed:OBFUSCATION_SEED,minify:MINIFY_OPTIONS,obfuscation:OBFUSCATION_OPTIONS,reservedStaticModuleRequests:dependencies,files:transformed},pack:{integrityRoot:root,files:await inventory(join(stage,'pack'))},policy:{...policy,sha256:sha(Buffer.from(JSON.stringify({allowedApis:policy.allowedApis,allowedPackRoots:policy.allowedPackRoots,schemaVersion:1})))},diagnostic,scope:'Local source transform, pack construction, and policy binding only. Does not establish browser/native execution or prevent reverse engineering.'}
    receipt.fontCoverage=fontCoverage
    await writeFile(join(stage,'private-receipt.json'),json(receipt),{flag:'wx'})
    await rm(immutable,{recursive:true,force:true})
    await rename(stage,out);published=true
    return {out,pack:join(out,'pack'),policy:join(out,'policy.json'),integrityRoot:root,sourceInventorySha256:receipt.source.inventorySha256,transformedModules:transformed.filter(file=>file.path.endsWith('.js')).length,blobs:result.blobCount}
  }finally{if(!published)await rm(stage,{recursive:true,force:true})}
}
export function parseArguments(args){const result={};for(let index=0;index<args.length;index++){const key={'--toolchain':'toolchain','--toolchain-lock':'toolchainLock','--input':'input','--out':'out','--font':'font'}[args[index]];requireValue(key&&args[index+1]&&!args[index+1].startsWith('--'),'Unknown or incomplete option: '+args[index]);requireValue(!result[key],'Duplicate option: '+args[index]);result[key]=args[++index]}return result}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))buildMiniapp(parseArguments(process.argv.slice(2))).then(value=>console.log(json(value))).catch(error=>{console.error(error.stack||error.message);if(error.diagnostics)console.error(json(error.diagnostics));process.exitCode=1})
