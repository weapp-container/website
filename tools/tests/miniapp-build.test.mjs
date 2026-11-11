import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {capabilityOverrides,ALLOWED_APIS,transformJavaScript,miniappSources,verifyToolchain,OBFUSCATION_OPTIONS,moduleDependencies} from '../build-miniapp.mjs'
import {inventory,sha} from '../export-toolchain.mjs'
const require=createRequire(import.meta.url)

test('protected modules retain static dependency requests required by the real pack loader',async()=>{
  const source="const model=require('./model');const catalog=require('../lib/catalog');module.exports={model,catalog};"
  const protectedSource=await transformJavaScript(source)
  assert.deepEqual(moduleDependencies(protectedSource),['../lib/catalog','./model'].sort())
  assert.throws(()=>moduleDependencies("module.exports=require(getPath())"),/Dynamic require/)
  await assert.rejects(transformJavaScript(source,{minify:async()=>({code:source}),obfuscate:()=>({getObfuscatedCode:()=>"module.exports=require(hiddenPath);"})}),/Dynamic require|dependency graph/)
})

test('new default APIs remain denied unless explicitly reviewed',()=>{
  const map=capabilityOverrides({'wx.request':'full','wx.newGameEngine':'full','wx.getWindowInfo':'full'})
  assert.equal(map['wx.newGameEngine'],'unsupported');assert.equal(map['wx.request'],'unsupported')
  assert.equal(map['wx.getWindowInfo'],'partial')
  assert.equal(map['wx.onHostLayoutChange'],'partial');assert.equal(map['wx.offHostLayoutChange'],'partial')
  assert.deepEqual(Object.entries(map).filter(([,value])=>value!=='unsupported').map(([name])=>name),ALLOWED_APIS)
  assert.equal(OBFUSCATION_OPTIONS.controlFlowFlattening,false);assert.equal(OBFUSCATION_OPTIONS.selfDefending,false)
})

test('protected CommonJS business modules preserve Chinese text, cents, specifications and order transitions',async()=>{
  const transformed=new Map()
  for(const name of ['catalog','font-coverage','model'])transformed.set(name,await transformJavaScript(await readFile(new URL('../../miniapp/lib/'+name+'.js',import.meta.url),'utf8')))
  const loaded=new Map()
  function load(name){
    if(loaded.has(name))return loaded.get(name)
    const module={exports:{}}
    vm.runInNewContext(transformed.get(name),{module,exports:module.exports,require:id=>load(id.replace('./',''))},{timeout:3000,filename:name+'.js'})
    loaded.set(name,module.exports);return module.exports
  }
  const original=require('../../miniapp/lib/model.js'),protectedModel=load('model')
  function scenario(library){
    const model=library.createModel()
    model.add('shop','bottle',1,2);model.address('detail','北京市朝阳区 · 演示大街 8 号');const shop=model.place('shop','2026-11-05T00:00:00Z');model.transition(shop.id,'complete')
    model.add('food','pizza',1,2);model.add('food','coffee',0,1);model.note('不要香菜，谢谢！');const food=model.place('food','2026-11-05T00:00:01Z');model.transition(food.id,'cancel')
    return JSON.parse(JSON.stringify(model.snapshot()))
  }
  assert.deepEqual(scenario(protectedModel),scenario(original))
  assert.notEqual(transformed.get('model'),await readFile(new URL('../../miniapp/lib/model.js',import.meta.url),'utf8'))
  assert.ok(!transformed.get('model').includes('sourceMappingURL'))
})

test('toolchain verification rejects changed files, extra files, wrong pins and symlinks',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'showcase-toolchain-test-')),root=join(temporary,'tooling')
  await mkdir(root)
  try{
    await writeFile(join(root,'entry.mjs'),'export const value=1\n')
    const receipt={schemaVersion:1,kind:'private-showcase-packer-toolchain',sourceCommit:'a'.repeat(40),files:await inventory(root)},bytes=Buffer.from(JSON.stringify(receipt)+'\n')
    await writeFile(join(root,'toolchain.json'),bytes)
    const lock={schemaVersion:1,kind:receipt.kind,sourceCommit:receipt.sourceCommit,receiptSha256:sha(bytes)}
    await writeFile(root+'.lock.json',JSON.stringify(lock))
    assert.equal((await verifyToolchain(root)).receipt.sourceCommit,receipt.sourceCommit)
    await writeFile(join(root,'entry.mjs'),'export const value=2\n');await assert.rejects(verifyToolchain(root),/inventory/)
    await writeFile(join(root,'entry.mjs'),'export const value=1\n');await writeFile(join(root,'unexpected.rs'),'private source');await assert.rejects(verifyToolchain(root),/inventory/)
    await rm(join(root,'unexpected.rs'));await writeFile(root+'.lock.json',JSON.stringify({...lock,receiptSha256:'0'.repeat(64)}));await assert.rejects(verifyToolchain(root),/pin mismatch/)
    await writeFile(root+'.lock.json',JSON.stringify(lock));await symlink(join(root,'entry.mjs'),join(root,'link.mjs'));await assert.rejects(verifyToolchain(root),/symlinks/)
  }finally{await rm(temporary,{recursive:true,force:true})}
})

test('native source staging fails when any required product image is absent',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'showcase-input-test-'))
  try{
    for(const path of ['app.js','app.json','app.wxss','container.config.json','pages/home/index.js','pages/home/index.wxml']){await mkdir(join(temporary,path,'..'),{recursive:true});await writeFile(join(temporary,path),'fixture')}
    await assert.rejects(miniappSources(temporary),/assets\/bottle.jpg/)
  }finally{await rm(temporary,{recursive:true,force:true})}
})

test('protected layout logic preserves rail edges, active folds and unobstructed forms',async()=>{
  const source=await readFile(new URL('../../miniapp/lib/layout.js',import.meta.url),'utf8'),code=await transformJavaScript(source),module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports},{timeout:3000});
  const plain=require('../../miniapp/lib/layout.js'),layout={version:1,safeInsets:{top:0,right:84,bottom:34,left:0},verticalBarEdge:'right',reservedRegions:[{id:'camera',kind:'occlusion',x:867,y:0,width:84,height:124},{id:'fold',kind:'division',x:455.5,y:0,width:40,height:669}]};
  for(const value of [layout,{...layout,reservedRegions:[]},{...layout,verticalBarEdge:'left',safeInsets:{top:0,right:0,bottom:34,left:84}},undefined])assert.deepEqual(JSON.parse(JSON.stringify(module.exports.pageLayout(951,669,value))),plain.pageLayout(951,669,value));
});
