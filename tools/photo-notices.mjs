import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const recipes=[{name:'shop-editorial',input:'mug',width:840,height:480},{name:'coffee-editorial',input:'coffee',width:640,height:600}];
export async function photoNotices(){
  assert.equal(sharp.versions.sharp,'0.34.5');assert.equal(sharp.versions.vips,'8.17.3');
  const sources=JSON.parse(await readFile(resolve(root,'miniapp/assets/SOURCES.json'),'utf8')),records=[];
  for(const source of sources){const bytes=await readFile(resolve(root,source.path));assert.equal(bytes.length,source.bytes);records.push({...source,sha256:sha(bytes)});}
  for(const recipe of recipes){
    const source=records.find(item=>item.name===recipe.input);assert.ok(source);
    const path='website/public/media/'+recipe.name+'.jpg',bytes=await readFile(resolve(root,path));
    const derived=await sharp(resolve(root,source.path)).resize(recipe.width,recipe.height,{fit:'cover'}).jpeg({quality:86}).toBuffer();
    assert.ok(bytes.equals(derived),'Editorial image is not the documented exact derivative: '+path);
    records.push({name:recipe.name,path,publicPath:'/media/'+recipe.name+'.jpg',source:source.source,license:source.license,licenseUrl:source.licenseUrl,bytes:bytes.length,sha256:sha(bytes),width:recipe.width,height:recipe.height,derivedFrom:{path:source.path,bytes:source.bytes,sha256:source.sha256},transform:{tool:'sharp',version:sharp.versions.sharp,libvips:sharp.versions.vips,resize:{width:recipe.width,height:recipe.height,fit:'cover'},jpeg:{quality:86}}});
  }
  return records;
}
export async function verifyPhotoNotices(site){
  const expected=await photoNotices(),actual=JSON.parse(await readFile(resolve(site,'media/PHOTO-LICENSES.json'),'utf8'));assert.deepEqual(actual,expected,'Public photo provenance differs from verified source/derivative bytes');
  const names=[];for(const item of actual)if(item.publicPath){assert.match(item.publicPath,/^\/media\/[a-z-]+\.jpg$/);const bytes=await readFile(resolve(site,'.'+item.publicPath));assert.equal(sha(bytes),item.sha256);assert.equal(bytes.length,item.bytes);names.push(item.publicPath.slice('/media/'.length));}
  assert.deepEqual((await readdir(resolve(site,'media'))).filter(name=>name.endsWith('.jpg')).sort(),names.sort(),'Unattributed editorial photograph');return {sources:actual.length,editorialImages:names.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.deepEqual(process.argv.slice(2),[]);await writeFile(resolve(root,'website/public/media/PHOTO-LICENSES.json'),JSON.stringify(await photoNotices(),null,2)+'\n');console.log('Verified and recorded seven source photographs and two exact website derivatives');
}
