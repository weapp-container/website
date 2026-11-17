import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,copyFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {frontendNoticesPlugin,verifyFrontendNotices} from '../frontend-notices.mjs';
import {photoNotices,verifyPhotoNotices} from '../photo-notices.mjs';
const require=createRequire(import.meta.url);

test('actual bundled package notices include complete pinned texts and reject a changed delivered license',async()=>{
  const site=await mkdtemp(resolve(tmpdir(),'showcase-notices-'));
  try{
    const emitted=[],plugin=frontendNoticesPlugin({proofPath:resolve(site,'private-proof.json')});
    await plugin.generateBundle.call({emitFile:item=>emitted.push(item)},{},{'client.js':{type:'chunk',fileName:'client.js',modules:{[require.resolve('react')]:{renderedLength:42}}}});
    for(const file of emitted){const path=resolve(site,file.fileName);await mkdir(dirname(path),{recursive:true});await writeFile(path,file.source);}
    const lock=JSON.parse(await readFile(new URL('../../website/frontend-licenses.lock.json',import.meta.url)));
    const result=await verifyFrontendNotices(site);assert.equal(result.packages,lock.packages.length);assert.equal(result.licenseFiles,lock.packages.reduce((count,item)=>count+item.files.length,0));
    const inventory=JSON.parse(await readFile(resolve(site,'licenses/frontend/notices.json'),'utf8'));
    assert.equal(inventory.packages.find(item=>item.name==='react').evidence.moduleCount,1);
    const license=resolve(site,'licenses/frontend',inventory.packages[0].files[0].path);await writeFile(license,'truncated');
    await assert.rejects(verifyFrontendNotices(site));
  }finally{await rm(site,{recursive:true,force:true});}
});

test('a newly bundled unreviewed transitive dependency fails the production notice gate',async()=>{
  const site=await mkdtemp(resolve(tmpdir(),'showcase-unreviewed-'));
  try{
    const directory=resolve(site,'node_modules/unreviewed-client');await mkdir(directory,{recursive:true});await writeFile(resolve(directory,'package.json'),JSON.stringify({name:'unreviewed-client',version:'1.0.0'}));
    const plugin=frontendNoticesPlugin({proofPath:resolve(site,'proof.json')});
    await assert.rejects(plugin.generateBundle.call({emitFile(){throw Error('Notice emitted before dependency admission');}},{},{'client.js':{type:'chunk',fileName:'client.js',modules:{[resolve(directory,'index.js')]:{renderedLength:1}}}}),/Unreviewed bundled frontend dependency/);
  }finally{await rm(site,{recursive:true,force:true});}
});

test('photo notices prove exact source derivatives and detect a replaced website photograph',async()=>{
  const site=await mkdtemp(resolve(tmpdir(),'showcase-photos-'));
  try{
    const records=await photoNotices();await mkdir(resolve(site,'media'));await writeFile(resolve(site,'media/PHOTO-LICENSES.json'),JSON.stringify(records));
    for(const item of records)if(item.publicPath)await copyFile(resolve(item.path),resolve(site,'.'+item.publicPath));
    assert.deepEqual(await verifyPhotoNotices(site),{sources:9,editorialImages:2});
    await writeFile(resolve(site,'media/shop-editorial.jpg'),'replaced image');await assert.rejects(verifyPhotoNotices(site));
  }finally{await rm(site,{recursive:true,force:true});}
});
