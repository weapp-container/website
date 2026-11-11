import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {create as createFont} from 'fontkit';
import {verifyFrontendNotices} from './frontend-notices.mjs';
import {verifyPhotoNotices} from './photo-notices.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base = resolve(root,'dist');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function walk(directory) { const result = []; for(const item of await readdir(directory,{withFileTypes:true})) { const path = resolve(directory,item.name); assert.ok(!item.isSymbolicLink(),'Site symlinks are forbidden'); if(item.isDirectory()) result.push(...await walk(path)); else if(item.isFile()) result.push(path); } return result; }
const files = await walk(base);
await verifyFrontendNotices(base);
await verifyPhotoNotices(base);
const fontReceipt=JSON.parse(await readFile(resolve(base,'fonts/font.json')));
assert.match(fontReceipt.fileName,/^showcase-sc-[a-f0-9]{16}\.woff2$/);
const fontBytes=await readFile(resolve(base,'fonts',fontReceipt.fileName));
assert.equal(sha(fontBytes),fontReceipt.sha256,'Website font differs from its reviewed subset');
const websiteFont=createFont(fontBytes);
assert.deepEqual((await readdir(resolve(base,'fonts'))).sort(),['OFL.txt','font.json',fontReceipt.fileName].sort(),'Unreviewed website font asset');
for(const path of files) {
  const rel = relative(base,path);
  assert.ok(!/(^|\/)(source|commands|raw|validation|cargo-target|project|node_modules|\.git|\.runtime)(\/|$)/.test(rel),`Private directory leaked: ${rel}`);
  assert.ok(!/\.(map|rs|cpp|cc|dart|ets|pdb|p12|jks|keystore|ts|tsx)$/.test(rel),`Private source/symbol file leaked: ${rel}`);
  assert.ok((await lstat(path)).size <= 25*1024*1024,`Asset exceeds Cloudflare limit: ${rel}`);
  if(/\.(mjs|js|html|css)$/.test(rel)) assert.ok(!/sourceMappingURL\s*=/.test(await readFile(path,'utf8')),`Source map reference leaked: ${rel}`);
}
const config = JSON.parse(await readFile(resolve(base,'showcase-runtime.json')));
assert.equal(config.distributionProfile,'restricted-showcase');
assert.match(config.policySha256,/^[a-f0-9]{64}$/); assert.match(config.packRoot,/^[a-f0-9]{64}$/);
assert.equal(config.entry,`/runtime/${config.deploymentHash}/index.html`);
const runtime = resolve(base,'runtime',config.deploymentHash);
const inventory = JSON.parse(await readFile(resolve(runtime,'deployment-inventory.json')));
assert.equal(inventory.packRoot,config.packRoot); assert.equal(inventory.policySha256,config.policySha256);
const index = JSON.parse(await readFile(resolve(runtime,'pack-index.json')));
assert.equal(index.integrityRoot,config.packRoot);
const manifestBytes = await readFile(resolve(runtime,index.manifest));
assert.equal(sha(manifestBytes),index.manifestSha256);
assert.equal(JSON.parse(manifestBytes).integrity.root,config.packRoot);
for(const blob of index.blobs) {
  assert.match(blob.url,/^portable-pack\/blobs\/sha256\/[a-f0-9]{64}\.bin$/);
  const bytes = await readFile(resolve(runtime,blob.url));
  assert.equal(bytes.length,blob.size); assert.equal(sha(bytes),blob.sha256);
}
for(const file of inventory.files) {
  assert.ok(!file.path.includes('..') && !file.path.startsWith('/'));
  const bytes = await readFile(resolve(runtime,file.path));
  assert.equal(bytes.length,file.size); assert.equal(sha(bytes),file.sha256,`Deployment byte mismatch: ${file.path}`);
}
const actualRuntime = (await walk(runtime)).map(path=>relative(runtime,path)).sort();
assert.deepEqual(actualRuntime,[...inventory.files.map(file=>file.path),'deployment-inventory.json'].sort(),'Unreviewed runtime file');
for(const file of ['index.html','demo/index.html','platforms/index.html','guide/index.html','404.html']) {
  const html = await readFile(resolve(base,file),'utf8');
  for(const character of new Set(html.match(/[\u3400-\u9fff]/gu)||[]))assert.ok(websiteFont.hasGlyphForCodePoint(character.codePointAt(0)),`Website font lacks ${character}; regenerate the reviewed subset`);
  assert.ok(!html.includes('—') && !html.includes('–'),`Unexpected editorial punctuation: ${file}`);
  for(const match of html.matchAll(/(?:src|href)="(\/(?!\/)[^"?#]+)(?:[^"\n]*)?"/g)) {
    if(match[1] === '/' || match[1].startsWith('/runtime/')) continue;
    const target = resolve(base,'.'+match[1],...(match[1].endsWith('/') ? ['index.html'] : []));
    assert.ok((await lstat(target)).isFile(),`Broken site asset: ${match[1]}`);
  }
}
console.log(JSON.stringify({status:'passed',files:files.length,distributionProfile:config.distributionProfile,deploymentHash:config.deploymentHash,packRoot:config.packRoot,policySha256:config.policySha256}));
