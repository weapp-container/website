import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DEVICE_REGISTRY,deviceGeometry} from '../website/shared/showcase-devices.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))).map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
// Some native manifest errors are returned as uncoded strings. Preserve that
// absence rather than manufacturing ERR_INVALID_MANIFEST in the report.
const describe=error=>({code:error?.code||String(error).match(/ERR_[A-Z_]+/)?.[0]||null,message:error?.message||String(error)});
const forbiddenApis=['wx.request','wx.requestPayment','wx.connectSocket','wx.socketTask.send','wx.getFileSystemManager','wx.fs.readFileSync','wx.createCameraContext','wx.getLocation','wx.login','wx.createCanvasContext','wx.canvas.draw'];

async function verifiedPack(directory) {
  const indexBytes=await readFile(resolve(directory,'pack-index.json')),index=JSON.parse(indexBytes);
  assert.equal(index.schemaVersion,1);
  assert.equal(index.manifest,'portable-pack/manifest.json');
  const manifestBytes=await readFile(resolve(directory,index.manifest)),manifest=JSON.parse(manifestBytes);
  assert.equal(sha(manifestBytes),index.manifestSha256,'Input manifest differs from its pack index');
  assert.equal(manifest.integrity.root,index.integrityRoot);
  const unsigned=structuredClone(manifest);unsigned.integrity.root='';
  assert.equal(sha(canonical(unsigned)),index.integrityRoot,'Input is not a valid content-rooted pack');
  const blobs=Object.create(null);
  await Promise.all(index.blobs.map(async blob=>{
    assert.match(blob.sha256,/^[a-f0-9]{64}$/);
    assert.equal(blob.url,`portable-pack/blobs/sha256/${blob.sha256}`,'Input blob URL is not its fixed address');
    const bytes=await readFile(resolve(directory,blob.url));
    assert.equal(bytes.length,blob.size);assert.equal(sha(bytes),blob.sha256,'Input pack has changed content');
    blobs[`sha256:${blob.sha256}`]=Array.from(bytes);
  }));
  const modules=manifest.modules.map(module=>{
    const bytes=blobs[`sha256:${module.sha256}`];assert.ok(bytes,'Declared module blob missing');
    return {id:module.id,bytes};
  });
  return {manifest,manifestText:manifestBytes.toString(),blobs,modules,indexSha256:sha(indexBytes),manifestSha256:sha(manifestBytes),blobCount:index.blobs.length};
}

export async function verifyRestrictedWasm({runtimeDirectory=resolve(root,'.runtime/web-duo'),unauthorizedDirectory=resolve(root,'.runtime/web-v13'),output=resolve(root,'artifacts/private/duo-adaptation/restricted-wasm-report.json')}={}) {
  const runtime=resolve(runtimeDirectory),checks=[],report={schemaVersion:1,status:'running',scope:'Real compiled WASM policy/API rejection in Node; no browser, GPU or installation claim',node:process.version,checks};
  try {
    const [receiptBytes,wasmBytes,wrapperBytes,pack,oldPack]=await Promise.all([
      readFile(resolve(runtime,'release-receipt.json')),readFile(resolve(runtime,'pkg/container_host_web_bg.wasm')),readFile(resolve(runtime,'pkg/container_host_web.js')),verifiedPack(runtime),verifiedPack(resolve(unauthorizedDirectory)),
    ]);
    const receipt=JSON.parse(receiptBytes);
    assert.equal(receipt.distributionProfile,'restricted-showcase');
    for(const [path,bytes] of [['pkg/container_host_web_bg.wasm',wasmBytes],['pkg/container_host_web.js',wrapperBytes]]) {
      const file=receipt.files.find(value=>value.path===path);assert.ok(file,'Binary receipt descriptor missing');
      assert.equal(bytes.length,file.size??file.bytes);assert.equal(sha(bytes),file.sha256,'Loaded binary differs from the producer receipt');
    }
    assert.ok(wasmBytes.includes(Buffer.from(`weapp-container-distribution:restricted-showcase:${receipt.policySha256}\0`)),'Compiled policy marker missing');
    assert.notEqual(oldPack.manifest.integrity.root,pack.manifest.integrity.root);
    report.binary={wasmSha256:sha(wasmBytes),wrapperSha256:sha(wrapperBytes),receiptSha256:sha(receiptBytes),source:receipt.source,distributionProfile:receipt.distributionProfile,policySha256:receipt.policySha256};
    report.packs={authorized:{root:pack.manifest.integrity.root,indexSha256:pack.indexSha256,manifestSha256:pack.manifestSha256,verifiedBlobs:pack.blobCount},unauthorized:{root:oldPack.manifest.integrity.root,indexSha256:oldPack.indexSha256,manifestSha256:oldPack.manifestSha256,verifiedBlobs:oldPack.blobCount}};
    const {initSync,WebWasmHost}=await import(pathToFileURL(resolve(runtime,'pkg/container_host_web.js')).href);
    initSync({module:wasmBytes});
    const withHost=run=>{const host=new WebWasmHost();try{return run(host);}finally{try{host.unload();}finally{host.free();}}};
    const geometry=deviceGeometry(DEVICE_REGISTRY.defaultSelection),{windowWidth,windowHeight,...displayMetrics}=geometry.metrics;
    let identity=0,sequence=0;
    const config=(extra={})=>({session_id:`restricted-wasm-${++identity}`,engine:'quickjs',require_integrity:true,renderer_mode:'external-frame',renderer_policy:{mode:'manifest'},engine_execution:{bootstrap_timeout_ms:10000,turn_timeout_ms:1000},view_execution:{batch_timeout_ms:500},host:{kind:'web',windowWidth,windowHeight,displayMetrics},...extra});
    const load=(host,manifestText,configuration)=>host.load_manifest_json_with_config(manifestText,JSON.stringify(configuration));
    const reject=(name,action,expectedCode,messagePattern)=>{
      let error;try{action();}catch(cause){error=describe(cause);}
      assert.ok(error,`${name}: operation unexpectedly accepted`);
      assert.equal(error.code,expectedCode,`${name}: hit the wrong rejection: ${error.message}`);
      if(messagePattern)assert.match(error.message,messagePattern,`${name}: rejection was not the intended gate`);
      const value={name,status:'rejected',...error};checks.push(value);return value;
    };
    const dispatch=(host,configuration,op,payload)=>{
      const requestId=`negative-${++sequence}`;
      const batch=JSON.parse(host.dispatch_json(JSON.stringify({protocolVersion:pack.manifest.protocolVersion,sessionId:configuration.session_id,requestId,kind:'request',op,payload})));
      const response=batch.messages.find(message=>message.kind==='response'&&message.requestId===requestId&&message.op===op);
      assert.ok(response,`No real response for ${op}`);return response.payload;
    };
    const denyBridge=(host,configuration,name,op,payload,expectedCode,messagePattern)=>{
      const response=dispatch(host,configuration,op,payload);
      assert.equal(response.ok,false,`${name}: operation unexpectedly accepted`);
      assert.equal(response.error?.code,expectedCode,`${name}: hit the wrong rejection`);
      if(messagePattern)assert.match(response.error.message,messagePattern);
      checks.push({name,status:'rejected',code:response.error.code,message:response.error.message});
    };
    report.capabilities=withHost(host=>JSON.parse(host.capabilities_json()));
    assert.equal(report.capabilities.distributionProfile,'restricted-showcase');assert.equal(report.capabilities.policySha256,receipt.policySha256);assert.equal(report.capabilities.quickjs,true);

    // Positive controls use exactly the same configuration parser and engine
    // selection as the old-pack probes, so syntax/engine errors cannot pass.
    withHost(host=>{
      const configuration=config();load(host,pack.manifestText,configuration);
      const state=JSON.parse(host.runtime_state_json());assert.equal(state.lifecycle,'Created');
      checks.push({name:'authorized-pack-valid-config',status:'accepted',lifecycle:state.lifecycle,engine:'quickjs',viewport:state.viewport});
    });
    for(const requireIntegrity of [true,false])withHost(host=>{
      const configuration=config({require_integrity:requireIntegrity});
      const rejected=reject(`valid-unauthorized-pack-integrity-${requireIntegrity}`,()=>load(host,oldPack.manifestText,configuration),'ERR_UNTRUSTED_APPLICATION',/pack is not part of this showcase distribution/);
      let unavailable;try{host.runtime_state_json();}catch(error){unavailable=describe(error);}
      assert.ok(unavailable,'A rejected pack installed a runtime session');rejected.runtimeAfterRejection=unavailable;
      rejected.phase='Session admission; no runtime session installed';
    });
    withHost(host=>{
      const changed=structuredClone(pack.manifest);changed.compiler.commit+='-tampered';
      reject('tampered-manifest-retained-root',()=>load(host,JSON.stringify(changed),config()),null,/invalid manifest: invalid integrity: root mismatch/);
    });
    withHost(host=>{
      const missing=structuredClone(pack.manifest);missing.integrity.root='';
      reject('blank-root-host-integrity-opt-out',()=>load(host,JSON.stringify(missing),config({require_integrity:false})),null,/invalid manifest: invalid integrity/);
    });
    withHost(host=>reject('development-sandbox-before-load',()=>host.enable_development_sandbox(),'ERR_UNSUPPORTED_CAPABILITY',/development sandbox is disabled in this distribution/));

    withHost(host=>{
      const configuration=config({capabilities:Object.fromEntries(forbiddenApis.map(api=>[api,'full']))});
      load(host,pack.manifestText,configuration);
      const apis=['wx.request','wx.requestPayment','wx.connectSocket'];
      host.configure_host_services_json(JSON.stringify({application:{hostAppId:'dev.weapp.container.showcase.negative',tenantId:'showcase',publisherId:'weapp-container',appId:'showcase',environment:'trial',version:receipt.sdkVersion,packRoot:pack.manifest.integrity.root},account:{principalId:null,epoch:'1'},apis}));
      const initialized=dispatch(host,configuration,'app.init',{modules:pack.modules,blobs:pack.blobs});
      assert.equal(initialized.ok,true,'Real authorized AppService initialization failed');assert.equal(initialized.engineProviderAvailable,true);assert.equal(initialized.appLaunchInvoked,true);assert.equal(initialized.loadedModules,pack.modules.length);
      const local=dispatch(host,configuration,'api.call',{name:'wx.getWindowInfo'});
      assert.equal(local.ok,true,'Allowed API positive control failed');assert.equal(local.result.windowWidth,windowWidth);assert.equal(local.result.pixelRatio,displayMetrics.pixelRatio);
      checks.push({name:'real-quickjs-init-and-valid-native-provider-regrant',status:'accepted',engineProviderAvailable:true,appLaunchInvoked:true,loadedModules:initialized.loadedModules,nativeApisRegistered:apis,hostCapabilityGrants:Object.keys(configuration.capabilities),positiveWindowInfo:local.result});
      for(const api of forbiddenApis) {
        assert.equal(initialized.capabilities[api]??'unsupported','unsupported',`${api} escaped capability publication`);
        denyBridge(host,configuration,`host-regrant-cannot-enable-${api}`,'api.call',{name:api,url:'https://example.invalid/showcase-negative',key:'forbidden',data:'forbidden'},'ERR_UNSUPPORTED_CAPABILITY',/unsupported/);
      }
      denyBridge(host,configuration,'debug-diagnostic','diagnostic',{},'ERR_UNSUPPORTED_CAPABILITY',/debug diagnostics are disabled in this distribution/);
      denyBridge(host,configuration,'debug-module-call','module.call',{moduleId:pack.modules[0].id,export:'inspect'},'ERR_UNSUPPORTED_CAPABILITY',/debug module calls and diagnostics are disabled in this distribution/);
      denyBridge(host,configuration,'undeclared-module-injection','module.load',{modules:[{id:'module:unauthorized.js',source:'globalThis.__forbidden = true;'}]},'ERR_MODULE_LOAD',/not declared in the manifest/);
      denyBridge(host,configuration,'modified-declared-module-injection','module.load',{modules:[{id:pack.modules[0].id,source:'globalThis.__forbidden = true;'}]},'ERR_MODULE_LOAD',/SHA-256 mismatch/);
      const requests=JSON.parse(host.take_host_requests_json());
      assert.equal(requests.filter(request=>request.kind==='call').length,0,'Denied API was delegated to a native provider');
      checks.push({name:'no-denied-native-calls-dispatched',status:'accepted',nativeCalls:0,localMessages:requests.filter(request=>request.kind==='message').length});
    });
    withHost(host=>{
      const configuration=config();load(host,pack.manifestText,configuration);
      const modified=pack.modules.map((module,index)=>index?module:{...module,bytes:Array.from(Buffer.from('App({});'))});
      denyBridge(host,configuration,'startup-module-bytes-tampered','app.init',{modules:modified,blobs:pack.blobs},'ERR_MODULE_LOAD',/SHA-256 mismatch/);
    });
    const exports=Object.getOwnPropertyNames(WebWasmHost.prototype);
    assert.ok(!exports.includes('authorize_pack')&&!exports.includes('replace_manifest_json')&&!exports.includes('set_dev_console_enabled'));
    report.authoritySurface={arbitraryPackAuthorization:false,manifestReplacement:false,devConsoleEnable:false,developmentSandboxExport:'present but verified rejected'};
    report.engineCreationEvidence={observed:'Valid unauthorized content-rooted pack rejected with ERR_UNTRUSTED_APPLICATION and no session installed; same config accepts the compiled pack and executes QuickJS',boundary:'Reviewed Rust Session::new verifies integrity + compiled pack root before SkiaPageBackend and engine construction',limitation:'The WASM API exposes no engine-construction counter; ordering follows the pinned Rust admission implementation, not a claimed runtime counter'};
    report.status='passed';
  } catch(error) {report.status='failed';report.error=describe(error);process.exitCode=1;}
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
  return report;
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),values={};
  for(let index=0;index<args.length;index+=2){assert.ok(['--runtime','--unauthorized-runtime','--output'].includes(args[index])&&args[index+1]&&!values[args[index]],'Invalid verification option');values[args[index]]=args[index+1];}
  const report=await verifyRestrictedWasm({runtimeDirectory:values['--runtime'],unauthorizedDirectory:values['--unauthorized-runtime'],output:values['--output']});
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,wasmSha256:report.binary?.wasmSha256,policySha256:report.binary?.policySha256,error:report.error},null,2));
}
