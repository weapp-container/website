import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,lstat,readdir,rm} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {minify} from 'terser';
import {init,parse} from 'es-module-lexer';
import {posix} from 'node:path';
import {validateDeviceRegistry,deviceGeometry} from '../website/shared/showcase-devices.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const safe = path => typeof path === 'string' && path && !path.startsWith('/') && !/[\\:\x00-\x20]/.test(path) && path.split('/').every(part => part && part !== '.' && part !== '..');
const forbidden = path => /(^|\/)(source|commands|raw|validation|cargo-target|project|node_modules|\.git)(\/|$)/.test(path) || /\.(rs|cpp|cc|ets|map|dSYM|pdb|dart|ts|tsx)$/.test(path);
const json = value => JSON.stringify(value,null,2)+'\n';
const modules = new Set(['canvaskit-presenter.mjs','text-flow-plan.mjs','render-inputs.mjs','surface-input.mjs','input-causal-ledger.mjs','runtime-worker.mjs','worker-runtime.mjs','worker-session-client.mjs','worker-bridge-transport.mjs','dom-presenter.mjs','dom-session-client.mjs','dom-animation-sample.mjs','worker-web-session.mjs','presentation-scheduler.mjs','worker-dom-adapter.mjs','worker-canvaskit-adapter.mjs','worker-admission-loader.mjs','host-api-binary-wire.mjs','worker-frame-wire.mjs','worker-product-config.mjs']);
const deliverable = path => modules.has(path) || path === 'pack-index.json' || path === 'RUNTIME-LICENSE' || /^licenses\//.test(path) || /^vendor\//.test(path) || /^pkg\/[^/]+\.(js|wasm)$/.test(path) || path === 'portable-pack/manifest.json' || /^portable-pack\/blobs\/sha256\/[a-f0-9]{64}$/.test(path);
export async function verifyModuleClosure(files) {
  await init();
  for(const [path,bytes] of files) {
    if (!/\.(mjs|js)$/.test(path) || path.startsWith('vendor/')) continue;
    for(const imported of parse(bytes.toString())[0]) {
      if (!imported.specifier) continue; // import.meta and the generated WASM loader's URL argument
      assert.ok(imported.specifier.startsWith('./') || imported.specifier.startsWith('../'),`External module in delivery: ${path}`);
      const target = posix.normalize(posix.join(posix.dirname(path),imported.specifier));
      assert.ok(safe(target) && files.has(target),`Missing module dependency: ${path} -> ${target}`);
    }
  }
}
export async function stageWebRuntime({runtimeDirectory,receiptSha256,outputDirectory = resolve(root,'website/public')}) {
  const registry = validateDeviceRegistry(JSON.parse(await readFile(resolve(root,'website/device-profiles.json'))));
  const base = resolve(runtimeDirectory), out = resolve(outputDirectory);
  assert.match(receiptSha256,/^[a-f0-9]{64}$/,'Exact private release receipt pin required');
  const receiptBytes = await readFile(resolve(base,'release-receipt.json'));
  assert.equal(sha(receiptBytes),receiptSha256,'Release receipt differs from private lock');
  const receipt = JSON.parse(receiptBytes);
  assert.equal(receipt.family,'web');
  assert.equal(receipt.distributionProfile ?? receipt.distribution?.distributionProfile,'restricted-showcase');
  const policySha256 = receipt.policySha256 ?? receipt.distribution?.policySha256;
  assert.match(policySha256,/^[a-f0-9]{64}$/);
  const index = JSON.parse(await readFile(resolve(base,'pack-index.json')));
  const files = new Map(), transforms = [];
  let productConfig;
  for (const descriptor of receipt.files) {
    const path = descriptor.path;
    assert.ok(safe(path),`Unsafe delivery receipt path: ${path}`);
    const stat = await lstat(resolve(base,path)); assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = await readFile(resolve(base,path));
    assert.equal(bytes.length,descriptor.size ?? descriptor.bytes); assert.equal(sha(bytes),descriptor.sha256);
    if(path === 'worker-product-config.json') productConfig = JSON.parse(bytes);
    if (!deliverable(path)) continue;
    assert.ok(!forbidden(path),`Forbidden delivery file: ${path}`);
    if (/\.(mjs|js)$/.test(path) && !path.startsWith('vendor/')) {
      const minimized = await minify(bytes.toString('utf8'),{module:true,mangle:true,compress:{passes:2},format:{comments:/@license|@preserve/},sourceMap:false});
      assert.ok(minimized.code && !minimized.map);
      const transformed = Buffer.from(minimized.code+'\n');
      transforms.push({path,sourceSha256:sha(bytes),sha256:sha(transformed)}); files.set(path,transformed);
    } else files.set(path,bytes);
  }
  // Explicit binary suffixes keep static hosts from treating content-addressed
  // blobs as document routes. The shared manifest and every blob stay byte exact;
  // only the Web index's pinned transport URLs change.
  assert.ok(productConfig,'Verified Worker product configuration is required');
  for(const blob of index.blobs) {
    const bytes = files.get(blob.url); assert.ok(bytes && sha(bytes) === blob.sha256 && bytes.length === blob.size);
    files.delete(blob.url); blob.url += '.bin'; files.set(blob.url,bytes);
  }
  const indexBytes = Buffer.from(json(index));
  files.set('pack-index.json',indexBytes);
  productConfig.index = {url:'./pack-index.json',sha256:sha(indexBytes),size:indexBytes.length};
  productConfig.viewport = deviceGeometry(registry.defaultSelection,registry).viewport;
  files.set('worker-product-config.mjs',Buffer.from('export const WORKER_PRODUCT_CONFIG='+JSON.stringify(productConfig)+';\n'));
  const config = {schemaVersion:1,runtimeVersion:receipt.sdkVersion,distributionProfile:'restricted-showcase',policySha256,packRoot:index.integrityRoot};
  for (const name of ['index.html','showcase.css','showcase-entry.mjs','showcase-bridge.mjs','showcase-device-controller.mjs','showcase-presentation.mjs','showcase-scene-controller.mjs']) {
    const bytes = await readFile(resolve(root,'website/runtime',name));
    const source = bytes.toString().replaceAll('../shared/showcase-devices.mjs','./showcase-devices.mjs');
    files.set(name,name.endsWith('.mjs') ? Buffer.from((await minify(source,{module:true,mangle:true,compress:true,sourceMap:false})).code+'\n') : bytes);
  }
  files.set('showcase-devices.mjs',Buffer.from((await minify(await readFile(resolve(root,'website/shared/showcase-devices.mjs'),'utf8'),{module:true,mangle:true,compress:true,sourceMap:false})).code+'\n'));
  files.set('showcase-device-registry.mjs',Buffer.from('export const DEVICE_REGISTRY='+JSON.stringify(registry)+';\n'));
  files.set('showcase-config.mjs',Buffer.from('export const SHOWCASE_CONFIG = '+JSON.stringify(config)+';\n'));
  await verifyModuleClosure(files);
  const binary = [...files].find(([path])=>/^pkg\/.*\.wasm$/.test(path));
  assert.ok(binary && binary[1].includes(Buffer.from(`weapp-container-distribution:restricted-showcase:${policySha256}\0`)),'Compiled Web artifact does not bind the reviewed policy');
  const inventory = [...files].map(([path,bytes])=>({path,sha256:sha(bytes),size:bytes.length})).sort((a,b)=>a.path.localeCompare(b.path));
  for (const file of inventory) assert.ok(file.size <= 25*1024*1024,`Cloudflare asset size exceeded: ${file.path}`);
  const deploymentHash = sha(json(inventory));
  const destination = resolve(out,'runtime',deploymentHash);
  await mkdir(destination,{recursive:true});
  for (const [path,bytes] of files) { await mkdir(dirname(resolve(destination,path)),{recursive:true}); await writeFile(resolve(destination,path),bytes); }
  await writeFile(resolve(destination,'deployment-inventory.json'),json({schemaVersion:1,...config,files:inventory}));
  let previous;
  try { previous = JSON.parse(await readFile(resolve(out,'showcase-runtime.json'))); } catch(error) { if(error.code !== 'ENOENT') throw error; }
  await writeFile(resolve(out,'showcase-runtime.json'),json({...config,entry:`/runtime/${deploymentHash}/index.html`,deploymentHash}));
  if(previous?.deploymentHash !== deploymentHash && /^[a-f0-9]{64}$/.test(previous?.deploymentHash || '')) {
    const old = resolve(out,'runtime',previous.deploymentHash);
    const oldInventory = JSON.parse(await readFile(resolve(old,'deployment-inventory.json')));
    assert.equal(oldInventory.distributionProfile,'restricted-showcase','Prior staging directory is not owned');
    await rm(old,{recursive:true});
  }
  await mkdir(resolve(root,'artifacts/web'),{recursive:true});
  await writeFile(resolve(root,'artifacts/web/staging-receipt.json'),json({schemaVersion:1,sourceReceiptSha256:receiptSha256,...config,deploymentHash,transforms,files:inventory}));
  return {deploymentHash,destination,files:inventory.length,...config};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), values = {};
  for(let i=0;i<args.length;i+=2){assert.ok(['--runtime','--receipt-sha256','--output'].includes(args[i]) && args[i+1]);values[args[i]]=args[i+1];}
  const result = await stageWebRuntime({runtimeDirectory:values['--runtime'] || resolve(root,'.runtime/web'),receiptSha256:values['--receipt-sha256'],outputDirectory:values['--output']});
  console.log(JSON.stringify(result,null,2));
}
