import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){assert.ok(['--url','--output'].includes(args[i])&&args[i+1]&&!options[args[i]]);options[args[i]]=args[i+1];}
const base=new URL(options['--url']||'https://container.weapp.dev');
assert.ok((base.protocol==='https:'||base.protocol==='http:'&&base.hostname==='127.0.0.1')&&!base.username&&!base.password&&base.pathname==='/'&&!base.search&&!base.hash);
const pin=JSON.parse(await readFile(resolve(root,'platforms/web-runtime.pin.json')));
const response=await fetch(new URL('/showcase-runtime.json',base),{signal:AbortSignal.timeout(30000),redirect:'error'});
assert.equal(response.status,200);const text=await response.text();assert.ok(Buffer.byteLength(text)<=8192);
const config=JSON.parse(text);
assert.equal(config.distributionProfile,'restricted-showcase');
for(const key of ['packRoot','policySha256'])assert.equal(config[key],pin[key]);
assert.match(config.deploymentHash,/^[a-f0-9]{64}$/);
assert.equal(config.entry,`/runtime/${config.deploymentHash}/index.html`);
const runtime=`/runtime/${config.deploymentHash}/`;
const paths=['/','/demo/','/guide/','/platforms/','/docs/','/docs/start/','/docs/integrations/android/','/docs/api/','/docs/api/wx-storage/','/docs/search-index.json','/sitemap.xml','/showcase-runtime.json',runtime,runtime+'pkg/container_host_web_bg.wasm',runtime+'vendor/fonts/NotoSansSC.ttf','/.git/config','/Cargo.toml','/source-snapshot.tar.gz'];
paths.push('/en/', '/en/guide/', '/en/platforms/', '/en/demo/', '/en/docs/', '/en/docs/start/', '/en/docs/api/wx-storage/', '/en/docs/search-index.json', '/en/does-not-exist');
const results=await Promise.all(paths.map(async path=>{
  const r=await fetch(new URL(path,base),{method:'HEAD',signal:AbortSignal.timeout(30000),redirect:'manual'});
  const h=Object.fromEntries(r.headers),privateProbe=['/.git/config','/Cargo.toml','/source-snapshot.tar.gz','/en/does-not-exist'].includes(path);
  assert.equal(r.status,privateProbe?404:200,`${path}: unexpected HTTP status`);
  assert.equal(h['x-content-type-options'],'nosniff');
  assert.ok(h['content-security-policy']?.includes("object-src 'none'")&&h['content-security-policy'].includes("frame-ancestors 'self'"));
  assert.ok(h['permissions-policy']?.includes('camera=()')&&h['permissions-policy'].includes('payment=()'));
  if(path.startsWith(runtime))assert.match(h['cache-control'],/max-age=31536000.*immutable/);
  if(path==='/showcase-runtime.json')assert.match(h['cache-control'],/no-cache/);
  if(!privateProbe&&h['content-type']?.includes('text/html'))assert.match(h['cache-control'],/(?:^|,)\s*no-transform(?:,|$)/,'HTML must stay inside the audited asset closure');
  if(path.endsWith('.wasm'))assert.match(h['content-type'],/application\/wasm/);
  return {path,status:r.status,headers:h};
}));
for (const [path, language] of [['/missing-document-41af', 'zh-CN'], ['/en/docs/missing-document-41af/', 'en']]) {
  const missing = await fetch(new URL(path, base), {signal: AbortSignal.timeout(30000), redirect: 'error'});
  assert.equal(missing.status, 404, `${path}: must remain an HTTP 404`);
  assert.match(await missing.text(), new RegExp(`<html lang="${language}"`), `${path}: wrong error-page language`);
  results.push({path, status: missing.status, language});
}
const report={schemaVersion:1,status:'passed',url:base.href,config,results};
const output=resolve(options['--output']||resolve(root,'artifacts/web/live/http.json'));
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,url:report.url,requests:results.length+1,deploymentHash:config.deploymentHash}));
