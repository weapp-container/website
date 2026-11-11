import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {chromium} from 'playwright';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args = process.argv.slice(2), options = {};
for(let i=0;i<args.length;i+=2) { assert.ok(['--url','--output','--mode','--device'].includes(args[i]) && args[i+1] && !options[args[i]],'Invalid browser smoke option'); options[args[i]] = args[i+1]; }
const base = new URL(options['--url'] || 'http://127.0.0.1:4325');
const output = resolve(options['--output'] || resolve(root,'artifacts/web/browser'));
const mode = options['--mode'] || 'smoke';
assert.ok(['smoke','capture','scroll-stability','scroll-boundary','devices','performance'].includes(mode));
const business = ['smoke','scroll-boundary','devices','performance'].includes(mode);
const deviceRegistry = JSON.parse(await readFile(resolve(root,'website/device-profiles.json'),'utf8'));
const demoURL = scene => { const url = new URL('/demo/',base); url.searchParams.set('scene',scene); if(options['--device'])url.searchParams.set('device',options['--device']); return url.href; };
await mkdir(output,{recursive:true});
const errors = [], failedResponses = [], failedRequests = [], unexpectedOrigins = new Set(), platformInjectedOrigins = new Set(), screenshots = [], checks = [];
const activeRequests=new Map(),slowRequests=[],resources=[],actions=[],coldStarts=[],sceneSwitchSamples=[],runtimeMeasurements={inputs:[],workerRpcs:[],acceptedFrames:[],hostQueueDrains:[]},collectedFrames=new WeakMap();
let browser, context, page, result, lastAction, performanceReport;
const percentile=(values,quantile)=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.max(0,Math.ceil(sorted.length*quantile)-1)]:null;};
const summarize=values=>({sampleCount:values.filter(Number.isFinite).length,p50Ms:percentile(values,.50),p95Ms:percentile(values,.95),p99Ms:percentile(values,.99),maxMs:percentile(values,1)});
const collectPerformanceReport=()=>{
  const inputLatency=runtimeMeasurements.inputs.filter(value=>Number.isFinite(value.latencyMs));
  const runtimeHash=page?.url().match(/\/runtime\/([a-f0-9]{64})\//)?.[1]
    ||resources.flatMap(value=>value.timing||[]).map(value=>value.name.match(/\/runtime\/([a-f0-9]{64})\//)?.[1]).find(Boolean)
    ||inputLatency.map(value=>value.owner?.match(/\/runtime\/([a-f0-9]{64})\//)?.[1]).find(Boolean)||null;
  return {browser:{name:process.env.SHOWCASE_BROWSER_CHANNEL||'chrome',version:browser?.version()||null,headless:true},viewport:page?.viewportSize()||null,runtimeHash,
    coldStart:summarize(coldStarts.map(value=>value.durationMs)),hotSceneSwitch:summarize(sceneSwitchSamples.map(value=>value.durationMs)),
    canvasInputToStableFrame:summarize(inputLatency.map(value=>value.latencyMs)),
    workerEventBatchRoundTrip:summarize(inputLatency.map(value=>value.workerRoundTripMs)),
    acceptedFrameToStable:summarize(inputLatency.map(value=>value.presentationSettleMs)),
    hostMessageDrain:summarize(runtimeMeasurements.hostQueueDrains.map(value=>value.durationMs)),
    workerPrepare:summarize(runtimeMeasurements.workerRpcs.map(value=>value.renderDiagnostics?.prepareMs)),
    workerExport:summarize(runtimeMeasurements.workerRpcs.map(value=>value.renderDiagnostics?.exportMs)),
    frameTransportSamples:runtimeMeasurements.workerRpcs.filter(value=>value.renderDiagnostics).map(value=>({requestId:value.requestId,...value.renderDiagnostics})),
    workerFrameRpc:summarize(runtimeMeasurements.workerRpcs.filter(value=>value.op==='frame').map(value=>value.durationMs)),
    samples:{coldStart:coldStarts.length,hotSceneSwitch:sceneSwitchSamples.length,inputToStableFrame:inputLatency.length,workerEventBatch:inputLatency.filter(value=>Number.isFinite(value.workerRoundTripMs)).length,
      acceptedFrameSettle:inputLatency.filter(value=>Number.isFinite(value.presentationSettleMs)).length,hostMessageDrain:runtimeMeasurements.hostQueueDrains.length},
    sceneSwitchSamples:[...sceneSwitchSamples],coldStartSamples:[...coldStarts],inputSamples:inputLatency,hostDrainSamples:[...runtimeMeasurements.hostQueueDrains]};
};
try {
  const channel = process.env.SHOWCASE_BROWSER_CHANNEL || 'chrome';
  browser = await chromium.launch({...(channel === 'bundled' ? {} : {channel}),headless:true});
  context = await browser.newContext({viewport:{width:1365,height:1100},deviceScaleFactor:Number(process.env.SHOWCASE_DEVICE_SCALE_FACTOR||2),hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    const BaseWorker=window.Worker,trace=[],diagnostics=[],frames=new Map(),pending=new Set();
    const work={pending:0,inputs:0,last:performance.now()};
    const metrics={inputs:[],workerRpcs:[],acceptedFrames:[],hostQueueDrains:[]};
    const pendingInputs=[];
    Object.defineProperty(window,'__showcaseSmokeMetrics',{value:metrics});
    Object.defineProperty(window,'__showcaseSmokeStartedAt',{value:performance.now()});
    Object.defineProperty(window,'__showcaseSmokeWork',{value:work});
    Object.defineProperty(window,'__showcaseSmokeTrace',{value:trace});
    Object.defineProperty(window,'__showcaseSmokeDiagnostics',{value:diagnostics});
    const nativeInputs=[],canvasIds=new WeakMap();let nextCanvasId=0;
    Object.defineProperty(window,'__showcaseSmokeNativeInputs',{value:nativeInputs});
    const recordNativeInput=(event,observer)=>{
      const canvas=document.querySelector('canvas');
      if(event.target.tagName==='CANVAS'&&!canvasIds.has(event.target))canvasIds.set(event.target,++nextCanvasId);
      const at=performance.now(),input={observer,time:at,type:event.type,target:event.target.tagName,canvasId:canvasIds.get(event.target),currentCanvas:event.target===canvas,connected:event.target.isConnected,ctrlKey:event.ctrlKey,x:event.clientX,y:event.clientY,deltaY:event.deltaY,inputEnabled:document.documentElement.dataset.inputEnabled,rect:canvas?.getBoundingClientRect().toJSON()};
      nativeInputs.push(input);
      if(observer==='document'&&event.target.tagName==='CANVAS'&&['pointerup','wheel'].includes(event.type))metrics.inputs.push({id:metrics.inputs.length+1,type:event.type,startedAt:at,beforeRevision:window.__showcaseSmokeFrameRevision,workerRequestId:null});
      if(nativeInputs.length>100)nativeInputs.shift();
      if(metrics.inputs.length>500)metrics.inputs.shift();
    };
    const nativeTypes=['wheel','pointerdown','pointerup','pointercancel','lostpointercapture'];
    for(const type of nativeTypes)document.addEventListener(type,event=>recordNativeInput(event,'document'),{capture:true,passive:true});
    const watchedCanvases=new WeakSet();
    new MutationObserver(()=>{for(const canvas of document.querySelectorAll('canvas'))if(!watchedCanvases.has(canvas)){watchedCanvases.add(canvas);for(const type of nativeTypes)canvas.addEventListener(type,event=>recordNativeInput(event,'canvas'),{capture:true,passive:true});}}).observe(document,{childList:true,subtree:true});
    Object.defineProperty(window,'__showcaseSmokeFrame',{value:null,writable:true});
    Object.defineProperty(window,'__showcaseSmokeFrameRevision',{value:null,writable:true});
    const keep=(direction,value)=>{
      const relevant=['load','bridge','frame','frame.current','ack'].includes(value.op);
      const at=performance.now();
      if(relevant&&direction==='send'){
        pending.add(value.requestId);work.last=at;
        if(value.op==='bridge'&&value.payload?.envelope?.op==='event.batch'){
          work.inputs++;
          const input=[...metrics.inputs].reverse().find(item=>item.workerRequestId===null&&item.startedAt<=at);
          if(input){input.workerRequestId=value.requestId;input.workerStartedAt=at;pendingInputs.push(input);}
        }
        metrics.workerRpcs.push({direction:'send',op:value.op,requestId:value.requestId,at});if(metrics.workerRpcs.length>1000)metrics.workerRpcs.shift();
      }
      const responseOk=value.payload?.status==='ok'||value.payload?.ok===true;
      if(relevant&&direction==='receive'&&(responseOk||['error','cancelled'].includes(value.payload?.status))){
        pending.delete(value.requestId);work.last=at;
        const rpc=[...metrics.workerRpcs].reverse().find(item=>item.direction==='send'&&item.requestId===value.requestId&&!('durationMs'in item));
        if(rpc){
          rpc.durationMs=at-rpc.at;rpc.status=value.payload.status|| (responseOk?'ok':'error');rpc.responseOp=value.op;rpc.renderDiagnostics=value.payload?.result?.renderDiagnostics??null;
          const input=metrics.inputs.find(item=>item.workerRequestId===value.requestId);
          if(input)input.workerRoundTripMs=rpc.durationMs;
        }
      }
      if(direction==='receive'&&value.op==='dirty')work.last=performance.now();
      work.pending=pending.size;
      if(value.op!=='native.take') trace.push({direction,time:performance.now(),kind:value.kind,op:value.op,requestId:value.requestId,payloadKeys:value.payload&&Object.keys(value.payload),error:value.payload?.error||value.error,state:value.payload?.state,diagnostic:value.op==='diagnostic'?value.payload:undefined,input:value.op==='bridge'?value.payload?.envelope:undefined});
      if(trace.length>100)trace.shift();
      const messages=value.payload?.result?.messages||value.payload?.messages||[];
      for(const message of messages) if(message.op==='diagnostic'||message.payload?.error) diagnostics.push(message);
      if(value.op==='diagnostic'||value.op==='fault'||value.payload?.error)diagnostics.push(value);
      if(diagnostics.length>30)diagnostics.splice(0,diagnostics.length-30);
      if(direction==='receive'&&responseOk) {
        const result=value.payload.result ?? value.payload;
        if(['frame','frame.current'].includes(value.op)&&result?.frame) {frames.set(result.renderRevision,result.frame);if(frames.size>8)frames.delete(frames.keys().next().value);}
        if(value.op==='ack'&&result?.inputEnabled===true&&frames.has(result.renderRevision)){
          window.__showcaseSmokeFrame=frames.get(result.renderRevision);window.__showcaseSmokeFrameRevision=result.renderRevision;
          const input=pendingInputs.find(item=>item.latencyMs===undefined&&item.beforeRevision!==result.renderRevision);
          if(input){
            input.acceptedAt=at;input.acceptedRevision=result.renderRevision;
            pendingInputs.splice(pendingInputs.indexOf(input),1);
            requestAnimationFrame(()=>requestAnimationFrame(()=>{
              if(window.__showcaseSmokeFrameRevision===result.renderRevision){input.stableAt=performance.now();input.latencyMs=input.stableAt-input.startedAt;input.presentationSettleMs=input.stableAt-input.acceptedAt;}
            }));
          }
        }
      }
    };
    window.Worker=class extends BaseWorker {
      constructor(...args){super(...args);this.addEventListener('message',event=>keep('receive',event.data));}
      postMessage(value,...args){keep('send',value);return super.postMessage(value,...args);}
    };
  });
  page = await context.newPage();
  context.on('request',request=>activeRequests.set(request,{url:request.url(),type:request.resourceType(),started:Date.now()}));
  context.on('requestfinished',request=>{const value=activeRequests.get(request);activeRequests.delete(request);if(value){slowRequests.push({...value,durationMs:Date.now()-value.started});slowRequests.sort((a,b)=>b.durationMs-a.durationMs);if(slowRequests.length>20)slowRequests.pop();}});
  context.on('requestfailed',request=>{
    const value=activeRequests.get(request);activeRequests.delete(request);
    let frameURL;try{frameURL=request.frame().url();}catch{/* Worker-owned requests have no frame. */}
    failedRequests.push({...value,url:request.url(),type:request.resourceType(),error:request.failure()?.errorText,navigation:request.isNavigationRequest(),frameURL,durationMs:value?Date.now()-value.started:undefined});
  });
  context.on('response',response => { if(response.status() >= 400) failedResponses.push({status:response.status(),url:response.url()}); });
  const platformOrigin = 'https://static.cloudflareinsights.com';
  page.on('pageerror',error => { errors.push(error.message); });
  page.on('console',message => { if(message.type() === 'error') { errors.push(message.text()); void Promise.all(message.args().map(value=>value.jsonValue().catch(()=>null))).then(values=>writeFile(resolve(output,'console-error-'+errors.length+'.json'),JSON.stringify(values,null,2))); } });
  page.on('request',request => { const url = new URL(request.url()); if(['http:','https:'].includes(url.protocol) && url.origin !== base.origin) { if(url.origin === platformOrigin) platformInjectedOrigins.add(url.origin); unexpectedOrigins.add(url.origin); } });
  async function capture(name,locator) {
    const path = resolve(output,name+'.png');
    await locator.screenshot({path,animations:'disabled'});
    const bytes = await readFile(path); screenshots.push({name,path,sha256:createHash('sha256').update(bytes).digest('hex')});
    return path;
  }
  async function checkDevicePicker(name,{touch=false}={}) {
    const trigger=page.getByRole('combobox',{name:'演示设备',exact:true});
    await page.waitForFunction(()=>document.querySelector('#showcase-device')?.disabled===false);
    const before=await page.locator('iframe').elementHandle(),url=page.url();
    if(touch)await trigger.tap();else {await trigger.focus();await page.keyboard.press('ArrowDown');}
    const list=page.getByRole('listbox');await list.waitFor();
    assert.equal(await list.getByRole('option').count(),deviceRegistry.devices.length);
    assert.equal(await list.getByRole('option',{selected:true}).count(),1);
    const box=await page.locator('.device-select-popup').boundingBox(),viewport=page.viewportSize();
    assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,'Device menu escaped the viewport');
    if(!touch){
      await page.keyboard.press('End');
      assert.ok((await list.locator('[data-highlighted]').textContent()).includes(deviceRegistry.devices.at(-1).label),'End did not highlight the last device');
    }
    await capture(name,page);
    if(touch) {
      // Tapping the current item dismisses without rebuilding its owner.
      await list.getByRole('option',{selected:true}).tap();
    }else await page.keyboard.press('Escape');
    await list.waitFor({state:'hidden'});
    if(!touch)assert.equal(await trigger.evaluate(element=>document.activeElement===element),true,'Escape did not return focus');
    assert.equal(page.url(),url,'Browsing the picker committed an unselected device');
    assert.equal(await before.evaluate(element=>element===document.querySelector('iframe')),true,'Browsing the picker replaced the owner');
    checks.push(name);
  }
  async function frameReady(scene) {
    const selector='iframe[title$="交互演示"]';
    await page.locator(selector).waitFor();
    const owner = await page.locator(selector).elementHandle();
    const frame = await owner.contentFrame();
    assert.ok(frame,'Showcase iframe missing');
    await frame.waitForFunction(()=>{const root=document.documentElement;return root?.dataset.state === 'ready' || root?.dataset.state === 'error';},null,{timeout:150000});
    assert.equal(await frame.locator('html').getAttribute('data-state'),'ready',await frame.locator('#startup').textContent());
    if(scene)await frame.waitForFunction(value=>document.documentElement.dataset.scene===value,scene,{timeout:15000});
    const startup=await frame.evaluate(()=>{if(window.__showcaseSmokeColdRecorded)return null;window.__showcaseSmokeColdRecorded=true;return performance.now()-window.__showcaseSmokeStartedAt;});
    if(startup!==null)coldStarts.push({scene:scene||'initial',durationMs:startup});
    assert.ok(await frame.locator('canvas').count() > 0,'Real CanvasKit surface missing');
    const measured=await frame.evaluate(()=>({device:document.documentElement.dataset.device,display:document.documentElement.dataset.display,rotation:document.documentElement.dataset.rotation,width:Number(document.documentElement.dataset.viewportWidth),height:Number(document.documentElement.dataset.viewportHeight),canvasWidth:document.querySelector('canvas').width,canvasHeight:document.querySelector('canvas').height,pixelRatio:devicePixelRatio,heap:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize}:null,graphics:(()=>{const gl=document.querySelector('canvas').getContext('webgl2');if(!gl)return null;const debug=gl.getExtension('WEBGL_debug_renderer_info');return {api:'webgl2',contextLost:gl.isContextLost(),vendor:gl.getParameter(debug?debug.UNMASKED_VENDOR_WEBGL:gl.VENDOR),renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER)};})()}));
    const profile=deviceRegistry.devices.find(value=>value.id===measured.device)?.displays.find(value=>value.id===measured.display)?.measurements[measured.rotation];
    assert.ok(profile,'Unknown rendered device');
    assert.equal(measured.width,profile.width,'Canvas must cover the complete logical window');assert.equal(measured.height,profile.height);
    const coverage=await page.locator('iframe').evaluate(el=>{const screen=el.parentElement;return {x:el.offsetLeft,y:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight,screenWidth:screen.clientWidth,screenHeight:screen.clientHeight};});
    assert.deepEqual(coverage,{x:0,y:0,width:profile.width,height:profile.height,screenWidth:profile.width,screenHeight:profile.height},'Iframe does not cover screen origin to edge');
    const fit=await page.locator('.device-fit-area').boundingBox(),phone=await page.locator('.phone-area').boundingBox();
    assert.ok(fit&&phone&&Math.abs(fit.height-phone.height)<1,'Device stage retained blank vertical space');
    assert.equal(measured.canvasWidth,Math.round(measured.width*measured.pixelRatio),'Canvas lost physical horizontal resolution');
    assert.equal(measured.canvasHeight,Math.round(measured.height*measured.pixelRatio),'Canvas lost physical vertical resolution');
    assert.ok(measured.graphics&&!measured.graphics.contextLost,'Live WebGL2 presenter unavailable');
    assert.ok(page.workers().length > 0,'AppService must run in an actual Dedicated Worker');
    const timing=await frame.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>/NotoSansSC\.ttf|\.wasm(?:$|\?)/.test(entry.name)).map(entry=>({name:entry.name,durationMs:entry.duration,transferSize:entry.transferSize,encodedBodySize:entry.encodedBodySize,decodedBodySize:entry.decodedBodySize})));
    const fontCache=await frame.evaluate(async()=>{const cache=await caches.open('weapp-container-showcase-font-v1');return (await cache.keys()).map(request=>request.url);});
    resources.push({scene,timing,fontCache,presentation:measured});
    if(base.protocol==='https:'){
      assert.ok(fontCache.some(url=>url.endsWith('/NotoSansSC.ttf')),'Verified font was not retained for the presenter');
      assert.ok(timing.filter(entry=>entry.name.endsWith('/NotoSansSC.ttf')).every(entry=>entry.transferSize===0),'Presenter downloaded the pinned font again instead of reusing verified font storage');
    }
    return frame;
  }
  await page.goto(options['--device']?demoURL('shop'):new URL('/demo/',base).href,{waitUntil:'domcontentloaded',timeout:90000});
  let frame = await frameReady('shop');
  async function collectRuntimeMetrics(){
    const handle=await page.locator('iframe[title$="交互演示"]').elementHandle().catch(()=>null),ownerFrame=await handle?.contentFrame();
    if(!ownerFrame)return;
    const sample=await ownerFrame.evaluate(()=>JSON.parse(JSON.stringify(window.__showcaseSmokeMetrics||{}))).catch(()=>null);
    if(!sample)return;
    const cursor=collectedFrames.get(ownerFrame)||{};
    for(const key of Object.keys(runtimeMeasurements)){
      const values=sample[key]||[],start=Math.min(cursor[key]||0,values.length);
      for(const item of values.slice(start))runtimeMeasurements[key].push({...item,owner:ownerFrame.url()});
      cursor[key]=values.length;
    }
    collectedFrames.set(ownerFrame,cursor);
  }
  const sceneLabels={shop:/逛一逛商城/,order:/点一份喜欢的/,basic:/试试基础交互/};
  async function switchScene(nextScene){
    const oldIframe=await page.locator('iframe[title$="交互演示"]').elementHandle(),oldWorker=page.workers()[0];
    assert.ok(oldWorker,'Scene transaction started without a Worker');
    await page.waitForFunction(()=>document.querySelector('.demo-stage')?.getAttribute('aria-busy')!=='true'
      && [...document.querySelectorAll('.scene-tab')].every(button=>!button.disabled),null,{timeout:25000});
    const startedAt=await page.evaluate(()=>performance.now());
    await page.getByRole('tab',{name:sceneLabels[nextScene]}).click();
    await frame.waitForFunction(value=>document.documentElement?.dataset.scene===value
      && document.documentElement?.dataset.state==='ready',nextScene,{timeout:25000});
    await page.waitForFunction(value=>new URL(location.href).searchParams.get('scene')===value
      && document.querySelector('.scene-tab[aria-selected="true"]')?.textContent?.includes(({shop:'逛一逛商城',order:'点一份喜欢的',basic:'试试基础交互'})[value]),nextScene,{timeout:25000});
    frame=await frameReady(nextScene);
    await page.waitForFunction(()=>document.querySelector('.demo-stage')?.getAttribute('aria-busy')!=='true'
      && [...document.querySelectorAll('.scene-tab')].every(button=>!button.disabled),null,{timeout:25000});
    const durationMs=await page.evaluate(start=>performance.now()-start,startedAt);
    assert.equal(await oldIframe.evaluate(element=>element===document.querySelector('iframe')),true,'Scene switch replaced its iframe owner');
    assert.equal(page.workers().length,1,'Scene switch leaked or rebuilt a Worker');
    assert.equal(page.workers()[0],oldWorker,'Scene switch replaced the active Worker');
    sceneSwitchSamples.push({scene:nextScene,durationMs});
    return frame;
  }
  if(mode==='performance'){
    for(const scene of ['order','basic','shop']){
      await page.goto(demoURL(scene),{waitUntil:'domcontentloaded',timeout:90000});
      frame=await frameReady(scene);
      assert.equal(page.workers().length,1,'Cold startup did not create exactly one Worker');
    }
    for(const scene of ['order','basic','shop','order','basic','shop','order','basic','shop','order','basic','shop'])await switchScene(scene);
  }
  // Observe only the genuine presented frame wire. Actions still use ordinary
  // pointer/wheel events; no runtime object, handler or guest state is invoked.
  const nodes = () => frame.evaluate(()=>{
    const rows=[];
    const visit=(node,dx=0,dy=0)=>{
      if(!node)return;
      rows.push({id:node.id,text:node.text,attributes:node.attributes||{},classes:node.classes||[],bounds:node.bounds&&{...node.bounds,x:node.bounds.x+dx,y:node.bounds.y+dy},scrollOffset:node.scrollOffset});
      for(const child of node.children||[])visit(child,dx-(node.scrollOffset?.scrollLeft||0),dy-(node.scrollOffset?.scrollTop||0));
    };visit(window.__showcaseSmokeFrame?.root);return rows;
  });
  const frameId=()=>frame.evaluate(()=>window.__showcaseSmokeFrameRevision);
  // A scroll can leave another native frame in flight after its first ACK.
  // Observe the genuine input send and a settled presentation before deciding
  // that the next pointer action completed.
  const idle=()=>frame.waitForFunction(()=>document.documentElement.dataset.inputEnabled==='true'&&window.__showcaseSmokeWork.pending===0&&performance.now()-window.__showcaseSmokeWork.last>=100,null,{timeout:15000});
  const inputSent=previous=>frame.waitForFunction(value=>window.__showcaseSmokeWork.inputs>value,previous,{timeout:15000});
  const viewport = () => frame.evaluate(()=>({width:Number(document.documentElement.dataset.viewportWidth),height:Number(document.documentElement.dataset.viewportHeight)}));
  async function surfacePoint(x,y) { const rect=await frame.locator('canvas').first().boundingBox(),size=await viewport();assert.ok(size.width>0&&size.height>0);return rect?{x:x*rect.width/size.width,y:y*rect.height/size.height}:null; }
  const state = () => page.evaluate(()=>JSON.parse(localStorage.getItem('weapp-container-showcase-state-v1')||'null'));
  const hasAction=(presented,handler,attributes={})=>presented.some(node=>node.attributes.bindtap===handler&&Object.entries(attributes).every(([key,value])=>String(node.attributes[key])===String(value)));
  const descendantText=(presented,parent)=>presented.filter(node=>node.text&&node.id?.replace(/^text:/,'node:').startsWith(parent.id+'.')).map(node=>node.text);
  const classText=(presented,className)=>presented.filter(node=>node.classes.includes(className)).flatMap(node=>descendantText(presented,node));
  const titleIs=(view,title)=>classText(view.presented,'top-title').includes(title);
  const activeAction=(view,handler,attributes,className)=>view.presented.some(node=>node.attributes.bindtap===handler&&node.classes.includes(className)&&Object.entries(attributes).every(([key,value])=>String(node.attributes[key])===String(value)));
  const quantity=presented=>{const parent=presented.find(node=>node.classes.includes('quantity'));return parent?Number(descendantText(presented,parent).find(value=>/^\d+$/.test(value))):NaN;};
  const motion=presented=>presented.find(node=>node.classes.includes('motion-dot'))?.attributes.style;
  const chromeGeometry=presented=>Object.fromEntries(['topbar','body','nav'].map(className=>{const node=presented.find(value=>value.classes.includes(className));return [className,{bounds:node?.bounds,scrollOffset:node?.scrollOffset}];}));
  const bodyScroll=presented=>presented.find(node=>node.classes.includes('body'))?.scrollOffset?.scrollTop||0;
  async function checkScrollBoundary(scene) {
    await page.locator('.phone-area').scrollIntoViewIfNeeded();
    // Leave room in both directions, so a leaked wheel cannot pass merely
    // because the outer page is already at an edge.
    await page.evaluate(()=>scrollTo(0,(document.scrollingElement.scrollHeight-innerHeight)/2));
    await idle();
    const outerBefore=await page.evaluate(()=>scrollY);
    const body=(await nodes()).find(node=>node.classes.includes('body'))?.bounds;
    assert.ok(body,'Scrollable guest body missing');
    const canvas=await frame.locator('canvas').first().boundingBox(),size=await viewport();
    await page.mouse.move(canvas.x+(body.x+body.width/2)*canvas.width/size.width,canvas.y+(body.y+body.height/2)*canvas.height/size.height);
    const samples=[];
    const wheel=async delta=>{
      await idle();
      const input=await frame.evaluate(()=>window.__showcaseSmokeWork.inputs);
      await page.mouse.wheel(0,delta);
      await inputSent(input);await idle();
      assert.equal(await page.evaluate(()=>scrollY),outerBefore,scene+' wheel leaked to the website');
      const offset=bodyScroll(await nodes());samples.push({delta,offset});return offset;
    };
    for(let i=0;i<15;i++){const before=bodyScroll(await nodes());if(await wheel(-650)===before)break;}
    assert.equal(bodyScroll(await nodes()),0,scene+' did not reach its top');
    await wheel(-180);
    assert.ok(await wheel(160)>0,scene+' guest did not consume a wheel from its top');
    const middle=bodyScroll(await nodes());
    // A burst also crosses input fences while accepted pictures are pending.
    for(const delta of [140,110,80,55,34,21,13,8])await page.mouse.wheel(0,delta);
    await idle();
    assert.equal(await page.evaluate(()=>scrollY),outerBefore,scene+' inertial wheel leaked');
    assert.ok(bodyScroll(await nodes())>middle,scene+' inertial wheel did not move guest content');
    for(let i=0;i<15;i++){const before=bodyScroll(await nodes());if(await wheel(650)===before)break;}
    const bottom=bodyScroll(await nodes());
    assert.ok(bottom>0,scene+' did not have scrollable content');
    assert.equal(await wheel(180),bottom,scene+' bottom was not stable');
    assert.ok(await wheel(-160)<bottom,scene+' guest did not scroll back from its bottom');
    // End Chromium's wheel latching before changing targets.
    await page.waitForTimeout(650);await page.mouse.move(12,350);
    await page.mouse.wheel(0,100);await page.waitForTimeout(300);
    const outerAfter=await page.evaluate(()=>scrollY);
    assert.ok(outerAfter>outerBefore,'The website must still scroll outside the screen');
    await page.waitForTimeout(650);
    actions.push({operation:'scroll-boundary',scene,outerBefore,outerAfter,middle,bottom,samples});
    checks.push(scene+'-guest-top-middle-bottom-inertia-and-outside-scroll');
  }
  async function observe(){const [presented,persisted,editorOpen,revision]=await Promise.all([nodes(),state(),frame.locator('#text-dialog[open]').count(),frameId()]);return {presented,state:persisted,editorOpen:editorOpen>0,revision};}
  async function preparePointer(point){
    const located=await frameId();
    // Locator hover can scroll the outer document. It also gives a guest timer
    // time to dirty its frame. Both taps and wheels must settle afterwards.
    const position=await surfacePoint(point.x,point.y);
    if(!position)return null; // A RAF may have replaced the sampled canvas.
    await frame.locator('canvas').first().hover({position});
    await idle();
    const before=await observe(),rect=await frame.locator('canvas').first().boundingBox(),size=await viewport();
    if(before.revision!==located||!rect)return null;
    const proof=await frame.evaluate(async()=>{
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const work=window.__showcaseSmokeWork;
      return {revision:window.__showcaseSmokeFrameRevision,inputEnabled:document.documentElement.dataset.inputEnabled,pending:work.pending,quietMs:performance.now()-work.last,inputs:work.inputs};
    });
    if(proof.revision!==located||proof.inputEnabled!=='true'||proof.pending!==0||proof.quietMs<100)return null;
    return {before,rect,position:{x:point.x*rect.width/size.width,y:point.y*rect.height/size.height},previous:located,previousInput:proof.inputs,proof};
  }
  async function checkLayout() {
    await idle();
    const presented=await nodes(),size=await viewport();
    const selected=await frame.evaluate(()=>({...document.documentElement.dataset}));
    const profile=deviceRegistry.devices.find(d=>d.id===selected.device)?.displays.find(d=>d.id===selected.display)?.measurements[selected.rotation];
    assert.ok(profile,'Layout check selected an unknown registered measurement');
    const layout=profile.hostLayout,app=presented.find(n=>n.classes.includes('app'));
    assert.deepEqual(app?.bounds,{x:0,y:0,width:size.width,height:size.height},'Guest background does not fill the actual window');
    const safe=layout.safeInsets,bodyNode=presented.find(n=>n.classes.includes('body')),body=bodyNode?.bounds;
    assert.ok(body&&body.x>=safe.left-.5&&body.y>=safe.top-.5&&body.x+body.width<=size.width-safe.right+.5&&body.y+body.height<=size.height-safe.bottom+.5,'Scrollable content escaped local safe area');
    const overlaps=(a,b)=>a.x<b.x+b.width-.5&&a.x+a.width>b.x+.5&&a.y<b.y+b.height-.5&&a.y+a.height>b.y+.5;
    const controls=presented.filter(n=>n.bounds&&['navigate','back','close'].includes(n.attributes.bindtap)&&!n.id?.startsWith(bodyNode?.id+'.'));
    assert.ok(controls.some(n=>n.attributes.bindtap==='close'),'Safe navigation is missing its close control');
    for(const control of controls){const b=control.bounds;assert.ok(b.width>0&&b.height>0&&b.x>=-.5&&b.y>=-.5&&b.x+b.width<=size.width+.5&&b.y+b.height<=size.height+.5,'Navigation control left window or has no hit area');for(const region of layout.reservedRegions)assert.ok(!overlaps(b,region),'Navigation control overlaps '+region.kind);}
    const rail=presented.find(n=>n.classes.includes('nav'));
    assert.ok(rail?.bounds,'Business navigation is missing');
    assert.equal(rail.classes.includes('nav-rail'),layout.verticalBarEdge!=='none','Navigation ignored system trait');
    if(layout.verticalBarEdge==='right')assert.ok(rail.bounds.x>=size.width-safe.right-.5);
    if(layout.verticalBarEdge==='left')assert.ok(rail.bounds.x+rail.bounds.width<=safe.left+.5);
    checks.push('full-surface-safe-controls-'+selected.device+'-'+selected.display+'-'+selected.rotation);
  }
  async function effect(check,label){
    for(let attempt=0;attempt<100;attempt++){
      await idle();const observed=await observe();
      if(check(observed))return observed;
      await page.waitForTimeout(100);
    }
    throw Error('Observed guest action did not reach '+label);
  }
  function actionEffect(handler,attributes,before){
    const expectation=(label,check)=>({label,check});
    if(['search','basicText','address','note'].includes(handler))return expectation('host text editor opened',view=>view.editorOpen);
    switch(handler){
      case 'navigate':return expectation('page '+attributes['data-screen'],view=>titleIs(view,{home:'Weapp Container',shop:'MORROW 商店',food:'日日食堂',orders:'我的订单'}[attributes['data-screen']]));
      case 'askReset':return expectation('reset confirmation',view=>hasAction(view.presented,'reset')&&hasAction(view.presented,'cancelReset'));
      case 'reset':return expectation('reset state and closed confirmation',view=>titleIs(view,'Weapp Container')&&!hasAction(view.presented,'reset')&&view.state?.orders.length===0&&view.state.cart.length===0&&view.state.foodCart.length===0);
      case 'detail':return expectation('product detail',view=>titleIs(view,'发现好物')&&hasAction(view.presented,'buyDetail'));
      case 'spec':return expectation('selected product specification',view=>activeAction(view,'spec',attributes,'spec-active'));
      case 'detailQuantity':{const expected=Math.max(1,Math.min(20,quantity(before.presented)+Number(attributes['data-delta'])));return expectation('detail quantity '+expected,view=>quantity(view.presented)===expected);}
      case 'buyDetail':return expectation('cart addition and cart page',view=>titleIs(view,'购物袋')&&JSON.stringify([view.state?.cart,view.state?.foodCart])!==JSON.stringify([before.state?.cart,before.state?.foodCart]));
      case 'openCart':return expectation('cart page',view=>titleIs(view,'购物袋'));
      case 'checkout':return expectation('checkout page',view=>titleIs(view,'确认订单')&&hasAction(view.presented,'askPay'));
      case 'askPay':return expectation('simulated payment confirmation',view=>hasAction(view.presented,'pay')&&hasAction(view.presented,'cancelPay'));
      case 'pay':{const known=new Set(before.state?.orders.map(order=>order.id)||[]);return expectation('new simulated order and receipt page',view=>titleIs(view,'订单详情')&&view.state?.orders.some(order=>!known.has(order.id))&&!hasAction(view.presented,'pay'));}
      case 'transition':{const id=before.presented.find(node=>/^WC\d+$/.test(node.text||''))?.text,status=attributes['data-action']==='complete'?'completed':'cancelled';assert.ok(id,'Presented order identity missing');return expectation('order '+id+' '+status,view=>view.state?.orders.some(order=>order.id===id&&order.status===status)&&hasAction(view.presented,'reorder'));}
      case 'pickup':return expectation('pickup choice '+attributes['data-value'],view=>view.state?.pickup===attributes['data-value']&&activeAction(view,'pickup',attributes,'chip-active'));
      case 'clearSearch':return expectation('cleared product search',view=>titleIs(view,'MORROW 商店')&&!hasAction(view.presented,'clearSearch')&&view.presented.filter(node=>node.attributes.bindtap==='detail').length===4);
      case 'animate':return expectation('motion advanced',view=>motion(view.presented)!==motion(before.presented));
      case 'count':{const expected=Number(classText(before.presented,'feature-number')[0])+1;return expectation('counter '+expected,view=>Number(classText(view.presented,'feature-number')[0])===expected);}
      default:throw Error('Semantic action expectation missing: '+handler);
    }
  }
  async function tapAction(handler,attributes={}) {
    for(let attempt=0;attempt<20;attempt++) {
      await idle();
      const presented=await nodes();
      const target=presented.find(node=>node.attributes.bindtap===handler&&Object.entries(attributes).every(([key,value])=>String(node.attributes[key])===String(value)));
      if(!target?.bounds){await page.waitForTimeout(100);continue;}
      // Use the visible label where present, including buttons with asymmetric
      // padding. The native frame remains the sole source of screen geometry.
      const label=presented.find(node=>node.text?.trim()&&node.id?.replace(/^text:/,'node:').startsWith(target.id+'.')&&node.bounds?.width>0&&node.bounds?.height>0);
      const {x,y,width,height}=label?.bounds||target.bounds;
      const size=await viewport();
      const body=presented.find(node=>node.classes.includes('body'));
      const inBody=body?.bounds&&target.id?.startsWith(body.id+'.');
      const lower=inBody?body.bounds.y+body.bounds.height:size.height,upper=inBody?body.bounds.y:0;
      const top=Math.max(upper,y),bottom=Math.min(lower,y+height);
      if(bottom-top>Math.min(height*.6,18)) {
        const point={x:Math.min(size.width-5,Math.max(5,x+width/2)),y:(top+bottom)/2},prepared=await preparePointer(point);
        if(!prepared)continue;
        const {previous,previousInput,rect,position,before,proof}=prepared;
        const expected=actionEffect(handler,attributes,before);
        lastAction={handler,attributes,target,label,point,previous,inputProof:proof,expected:expected.label,overlaps:presented.filter(node=>node.bounds&&point.x>=node.bounds.x&&point.x<node.bounds.x+node.bounds.width&&point.y>=node.bounds.y&&point.y<node.bounds.y+node.bounds.height)};
        await page.mouse.click(rect.x+position.x,rect.y+position.y);
        await inputSent(previousInput);
        // A toast timeout or unrelated animation can also produce a new frame.
        // Require this action's rendered/persisted effect after the real input.
        const observed=await effect(expected.check,expected.label);
        if(handler==='count'){
          assert.deepEqual(chromeGeometry(observed.presented),chromeGeometry(before.presented),'Header feedback changed the viewport geometry or body scroll offset');
          const header=observed.presented.find(node=>node.classes.includes('topbar'))?.bounds,status=observed.presented.find(node=>node.classes.includes('top-status'))?.bounds;
          assert.ok(header&&status&&header.height===64&&status.y>=header.y&&status.y+status.height<=header.y+header.height,'Feedback escaped the fixed header');
        }
        actions.push({handler,attributes,expected:expected.label,frameBefore:previous,frameAfter:observed.revision});
        await collectRuntimeMetrics();
        return;
      }
      const middle=(upper+lower)/2;
      const prepared=await preparePointer({x:body?.bounds?body.bounds.x+body.bounds.width/2:size.width/2,y:middle});
      if(!prepared)continue;
      const {previous,previousInput,before,proof,rect}=prepared,scrollBefore=bodyScroll(before.presented);
      const delta=y<upper?-Math.min(450,middle-y):Math.min(450,Math.max(80,y-middle));
      lastAction={handler,attributes,operation:'wheel',target,label,previous,previousInput,inputProof:proof,scrollBefore,delta,canvas:rect};
      await page.mouse.wheel(0,delta);
      await inputSent(previousInput);
      const observed=await effect(view=>Math.sign(delta)*(bodyScroll(view.presented)-scrollBefore)>0,'body scroll in the requested direction');
      actions.push({handler,attributes,operation:'wheel',frameBefore:previous,frameAfter:observed.revision,scrollBefore,scrollAfter:bodyScroll(observed.presented)});
      await collectRuntimeMetrics();
    }
    throw Error('Presented action unavailable: '+handler+' '+JSON.stringify(attributes));
  }
  async function expectState(check,label) {
    for(let attempt=0;attempt<100;attempt++){const value=await state();if(value&&check(value))return value;await page.waitForTimeout(100);}
    throw Error('Persisted guest state did not reach '+label);
  }
  async function edit(value) {
    await frame.locator('#text-dialog[open]').waitFor({timeout:10000});
    await frame.locator('#text-value').fill(value);
    // The scaled device can start below the fold on a phone-sized host.
    // Scroll its actual outer bounds into view before clicking the dialog.
    await page.locator('.phone-area').scrollIntoViewIfNeeded();
    await frame.locator('#text-commit').click();
    await frame.locator('#text-dialog[open]').waitFor({state:'hidden'});
    await effect(view=>view.presented.some(node=>node.text===value),'committed host text '+value);
  }
  await writeFile(resolve(output,'view-tree.json'),JSON.stringify(await frame.evaluate(()=>{const v=window.__showcaseSmokeFrame,rows=[];const visit=n=>{if(!n)return;rows.push(Object.fromEntries(Object.entries(n).filter(([k])=>!['children','text_layout','style','computed_style'].includes(k))));for(const c of n.children||[])visit(c)};visit(v.root);return {keys:Object.keys(v),rows}}),null,2));
  await checkLayout();
  const shop = await capture('demo-shop',frame.locator('#surface-root'));
  const color = await sharp(shop).stats();
  assert.ok(color.channels.slice(0,3).some(channel=>channel.stdev > 20),'Rendered screen is blank');
  checks.push('worker-wasm-canvaskit-startup');
  await checkDevicePicker('device-picker-desktop-keyboard');
  if(mode==='scroll-boundary')await checkScrollBoundary('shop');
  if(mode === 'scroll-stability') {
    for(let cycle=0;cycle<12;cycle++) {
      await tapAction('navigate',{'data-screen':'home'});
      await tapAction('askReset');await tapAction('reset');
      await expectState(value=>value.orders.length===0&&value.cart.length===0,'stability reset');
      await tapAction('navigate',{'data-screen':'shop'});
    }
    checks.push('twelve-native-scroll-reset-cycles');
  }
  if(business) {
    await tapAction('search');await edit('陶瓷');
    checks.push('host-chinese-text-commit');
    await capture('demo-search',frame.locator('#surface-root'));
    await tapAction('detail',{'data-id':'mug'});
    await tapAction('spec',{'data-index':1});
    await tapAction('detailQuantity',{'data-delta':1});
    await tapAction('buyDetail');
    await expectState(value=>value.cart.length===1&&value.cart[0].spec===1&&value.cart[0].quantity===2,'shopping variant and quantity');
    await capture('demo-cart',frame.locator('#surface-root'));
    await page.reload({waitUntil:'domcontentloaded',timeout:90000});frame=await frameReady('shop');
    await expectState(value=>value.cart[0]?.quantity===2,'cart refresh restore');
    checks.push('cart-variant-quantity-refresh-restore');
    await tapAction('openCart',{'data-kind':'shop'});await tapAction('checkout');
    await tapAction('address',{'data-field':'detail'});await edit('上海市 · 演示公园 8 号');
    await expectState(value=>value.address.detail==='上海市 · 演示公园 8 号','Chinese address');
    await tapAction('askPay');await tapAction('pay');
    await expectState(value=>value.orders[0]?.kind==='shop'&&value.orders[0].status==='paid'&&value.orders[0].total===17800&&value.cart.length===0,'simulated shopping payment');
    await capture('demo-shop-order',frame.locator('#surface-root'));
    await tapAction('transition',{'data-action':'complete'});
    await expectState(value=>value.orders[0]?.status==='completed','simulated receipt');
    checks.push('shop-address-mock-pay-order-receipt');
  }
  frame = await switchScene('basic');
  if(mode==='scroll-boundary')await checkScrollBoundary('basic');
  await capture('demo-basic',frame.locator('#surface-root'));
  if(business) {
    await tapAction('count');checks.push('header-feedback-preserves-viewport-and-scroll');
    await tapAction('basicText');await edit('你好，容器');
    assert.ok((await nodes()).some(value=>value.text==='你好，容器'));
    await tapAction('animate');
    await frame.waitForFunction(()=>{const visit=node=>node&&(node.classes?.includes('motion-dot')&&node.attributes?.style==='left:210px'||node.children?.some(visit));return visit(window.__showcaseSmokeFrame?.root);},null,{timeout:30000});
    assert.ok((await nodes()).some(value=>value.classes.includes('motion-dot')&&value.attributes.style==='left:210px'));
    checks.push('basic-native-input-scroll-animation');
    await tapAction('basicText');await frame.locator('#text-dialog[open]').waitFor();
  }
  checks.push('worker-preserving-scene-transactions');
  frame = await switchScene('order');
  if(mode==='scroll-boundary') {
    await checkScrollBoundary('order');
    const before=await frame.evaluate(()=>document.documentElement.dataset.rotation);
    await page.getByRole('button',{name:'旋转屏幕',exact:true}).click();
    await frame.waitForFunction(previous=>document.documentElement.dataset.rotation!==previous&&document.documentElement.dataset.deviceSwitching==='false',before,{timeout:30000});
    await frameReady();await checkLayout();await checkScrollBoundary('order-rotated');
  }
  await capture('demo-order',frame.locator('#surface-root'));
  if(business) {
    assert.equal(await frame.locator('#text-dialog[open]').count(),0,'Prior scene editor leaked');
    assert.equal(page.workers().length,1,'Prior scene Worker leaked');
    await tapAction('detail',{'data-id':'coffee'});await tapAction('spec',{'data-index':1});await tapAction('buyDetail');
    await tapAction('note');await edit('少糖，不加冰');
    await tapAction('pickup',{'data-value':'店内用餐'});await tapAction('checkout');await tapAction('askPay');await tapAction('pay');
    await expectState(value=>value.orders[0]?.kind==='food'&&value.orders[0].status==='preparing'&&value.orders[0].note==='少糖，不加冰'&&value.orders[0].pickup==='店内用餐','food preparation');
    await capture('demo-food-order',frame.locator('#surface-root'));
    await tapAction('transition',{'data-action':'complete'});
    await expectState(value=>value.orders.length===2&&value.orders[0].status==='completed','simulated pickup');
    checks.push('food-spec-note-pickup-mock-pay-preparation-complete');
    if(mode==='devices') {
      await tapAction('navigate',{'data-screen':'shop'});
      await tapAction('detail',{'data-id':'mug'});await tapAction('buyDetail');
      await expectState(value=>value.cart.length===1&&value.orders.length===2,'state before folding');
      const preserved=await state(),duoWorker=page.workers()[0];
      for(const display of ['outer','inner','outer','inner']) {
        await page.getByRole('button',{name:display==='outer'?'折叠屏幕':'展开屏幕',exact:true}).click();
        await frame.waitForFunction(value=>document.documentElement.dataset.display===value&&document.documentElement.dataset.inputEnabled==='true',display,{timeout:30000});
        await frame.waitForFunction(()=>document.documentElement.dataset.deviceSwitching==='false');
        await page.getByRole('button',{name:display==='outer'?'展开屏幕':'折叠屏幕',exact:true}).waitFor({state:'visible'});
        await frameReady();await checkLayout();
        await idle();assert.equal(page.workers()[0],duoWorker,'Folding replaced the active session');assert.equal(page.workers().length,1);
        assert.deepEqual(await state(),preserved,'Folding changed commerce state');
        const priorRotation=await frame.evaluate(()=>document.documentElement.dataset.rotation);
        await page.getByRole('button',{name:'旋转屏幕',exact:true}).click();
        await frame.waitForFunction(value=>document.documentElement.dataset.rotation!==value&&document.documentElement.dataset.inputEnabled==='true',priorRotation,{timeout:30000});
        await frame.waitForFunction(()=>document.documentElement.dataset.deviceSwitching==='false');
        await frameReady();await checkLayout();
        await idle();assert.equal(page.workers()[0],duoWorker,'Rotation replaced the active session');assert.deepEqual(await state(),preserved,'Rotation changed commerce state');
      }
      checks.push('four-continuous-folds-rotations-preserve-session-cart-orders');
      for(const device of [...deviceRegistry.devices.slice(1),deviceRegistry.devices[0]]) {
        // Leave a real native editor open, then ensure a retired owner's
        // result cannot survive the acknowledged device replacement.
        await tapAction('navigate',{'data-screen':'shop'});await tapAction('search');
        await frame.locator('#text-dialog[open]').waitFor();
        const trigger=page.getByRole('combobox',{name:'演示设备',exact:true});
        if(device.id===deviceRegistry.devices[1].id){
          await trigger.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
        }else{
          await trigger.click();await page.getByRole('option',{name:device.label,exact:true}).click();
        }
        await page.waitForFunction(id=>{const html=document.querySelector('iframe')?.contentDocument?.documentElement;return html?.dataset.device===id&&html.dataset.state==='ready'&&html.dataset.inputEnabled==='true';},device.id,{timeout:150000});
        frame=await frameReady();await checkLayout();await idle();
        assert.equal(page.workers().length,1,'Previous device Worker leaked');
        assert.equal(await frame.locator('#text-dialog[open]').count(),0,'Previous device editor leaked');
        assert.deepEqual(await state(),preserved,'Changing device changed commerce state');
        const selection=await frame.evaluate(()=>({...document.documentElement.dataset}));
        assert.ok(Number(selection.viewportWidth)>0&&Number(selection.viewportHeight)>0);
        await tapAction('navigate',{'data-screen':'shop'});await tapAction('search');await edit('陶瓷');
        assert.ok((await nodes()).some(value=>value.text==='慢时光陶瓷杯'));
        await tapAction('clearSearch');
        const before=await frame.evaluate(()=>document.documentElement.dataset.rotation);
        await page.getByRole('button',{name:'旋转屏幕',exact:true}).click();
        await frame.waitForFunction(previous=>document.documentElement.dataset.rotation!==previous&&document.documentElement.dataset.inputEnabled==='true',before,{timeout:30000});
        await frameReady();await checkLayout();await idle();await tapAction('navigate',{'data-screen':'food'});
        await capture('device-'+device.id,frame.locator('#surface-root'));
        assert.equal(await page.locator('body').evaluate(element=>element.scrollWidth<=innerWidth),true,'Device preview overflow');
        assert.deepEqual(await state(),preserved);
      }
      checks.push('six-devices-rotate-coordinate-scroll-native-Chinese-editor-owner-retirement');
    }
    await tapAction('navigate',{'data-screen':'home'});await tapAction('askReset');await tapAction('reset');
    await expectState(value=>value.orders.length===0&&value.cart.length===0&&value.foodCart.length===0&&value.address.detail.includes('演示路 18 号'),'reset');
    await page.reload({waitUntil:'domcontentloaded',timeout:90000});frame=await frameReady('order');
    await expectState(value=>value.orders.length===0&&value.cart.length===0,'reset refresh');
    checks.push('reset-persisted-and-editor-owner-retirement');
  }
  await checkLayout();
  const persistedBeforeClose=await state();
  let prepared,closeTarget,closePoint;
  // Hovering can scroll the outer page or coincide with a guest toast frame.
  // Locate the close target again until the same presented frame stays current.
  for(let attempt=0;attempt<20&&!prepared;attempt++){
    await idle();
    const closeControl=(await nodes()).find(n=>n.attributes.bindtap==='close');
    assert.ok(closeControl?.bounds,'Guest close missing');
    const b=closeControl.bounds;
    closeTarget=closeControl;closePoint={x:b.x+b.width/2,y:b.y+b.height/2};
    prepared=await preparePointer(closePoint);
  }
  assert.ok(prepared,'Guest close not interactive');
  await collectRuntimeMetrics();
  lastAction={handler:'close',target:closeTarget,point:closePoint,previous:prepared.previous,inputProof:prepared.proof,expected:'closed owner, persisted state and zero Workers'};
  await Promise.all([
    once(page.workers()[0],'close',{signal:AbortSignal.timeout(15000)}),
    page.mouse.click(prepared.rect.x+prepared.position.x,prepared.rect.y+prepared.position.y),
  ]);
  await frame.waitForFunction(()=>document.documentElement.dataset.state==='closed',null,{timeout:15000});
  assert.equal(page.workers().length,0,'Guest close leaked Worker');
  await page.getByRole('button',{name:'重新启动当前演示',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>{const button=[...document.querySelectorAll('button')].find(value=>value.getAttribute('aria-label')==='重新启动当前演示');return button && !button.disabled;},null,{timeout:15000});
  const flushedState=await state();
  assert.equal(flushedState?.schemaVersion,1,'Guest close did not persist the current state');
  assert.ok(Number.isSafeInteger(flushedState.revision)&&flushedState.revision>=0,'Guest close persisted an invalid session revision');
  if(persistedBeforeClose!==null){
    // Model restore deliberately starts the new session's revision at zero.
    // The host may still hold the previous session counter until this flush.
    const {revision:previousRevision,...previousCommerce}=persistedBeforeClose;
    const {revision:flushedRevision,...flushedCommerce}=flushedState;
    assert.deepEqual(flushedCommerce,previousCommerce,'Guest close changed persisted commerce state');
    lastAction.persistedRevisionBefore=previousRevision;lastAction.persistedRevisionAfter=flushedRevision;
  }
  actions.push({handler:'close',expected:lastAction.expected,frameBefore:prepared.previous,persistedRevisionBefore:persistedBeforeClose?.revision,persistedRevisionAfter:flushedState.revision});
  checks.push('safe-guest-close-flush-and-worker-retirement');
  const closedOwner=await page.locator('iframe[title$="交互演示"]').elementHandle();
  const closedSelection=await frame.evaluate(()=>{const {device,display,rotation}=document.documentElement.dataset;return {device,display,rotation};});
  assert.ok(closedOwner,'Closed owner disappeared before restart');
  await page.getByRole('button',{name:'重新启动当前演示',exact:true}).click();
  // Restart intentionally replaces the iframe after its close ACK. Wait for
  // that exact owner boundary before frameReady binds to the new document.
  await page.waitForFunction(previous=>{const next=document.querySelector('iframe[title$="交互演示"]');return !previous.isConnected&&next&&next!==previous;},closedOwner,{timeout:15000});
  frame=await frameReady();
  assert.deepEqual(await frame.evaluate(()=>{const {device,display,rotation}=document.documentElement.dataset;return {device,display,rotation};}),closedSelection,'Restart changed the selected device state');
  assert.equal(page.workers().length,1,'Restart did not create exactly one new Worker');
  assert.deepEqual(await state(),flushedState,'Restart changed persisted commerce state');
  checks.push('closed-owner-replaced-before-restart-ready');
  if(mode==='scroll-boundary')await checkScrollBoundary('order-restarted');
  await frame.evaluate(()=>parent.postMessage({type:'test.noop'},location.origin));
  await Promise.all([
    once(page.workers()[0],'close',{signal:AbortSignal.timeout(15000)}),
    page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'showcase.close',schemaVersion:1,requestId:'smoke-close'},location.origin)),
  ]);
  await frame.waitForFunction(()=>document.documentElement.dataset.state === 'closed',null,{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('iframe').contentDocument.querySelector('#surface-root').children.length === 0);
  assert.equal(page.workers().length,0,'Dedicated Worker leaked after close');
  checks.push('acknowledged-worker-close');
  await page.goto(base.href,{waitUntil:'domcontentloaded',timeout:90000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>{const image=document.querySelector('.hero-device img');return image?.complete&&image.naturalWidth>0;},null,{timeout:90000});
  await page.locator('.hero-device img').evaluate(image=>image.decode());
  checks.push('real-demo-hero-image-decoded');
  await capture('website-desktop',page);
  assert.equal(await page.locator('body').evaluate(element=>element.scrollWidth <= innerWidth),true,'Desktop horizontal overflow');
  await page.setViewportSize({width:390,height:844});
  await capture('website-mobile',page);
  assert.equal(await page.locator('body').evaluate(element=>element.scrollWidth <= innerWidth),true,'Mobile horizontal overflow');
  await page.getByRole('button',{name:/切换/}).click();
  await capture('website-mobile-dark',page);
  // Full-page capture can start lazy preview images. Let those real requests
  // settle before leaving, so the next navigation cannot abort our own audit.
  await page.waitForLoadState('networkidle',{timeout:90000});
  await page.goto(demoURL('shop'),{waitUntil:'domcontentloaded',timeout:90000});frame=await frameReady('shop');
  await tapAction('search');await edit('陶瓷');
  assert.ok((await nodes()).some(node=>node.text==='慢时光陶瓷杯'),'Mobile scaled surface lost Chinese input');
  await collectRuntimeMetrics();
  await capture('website-mobile-demo',page);
  assert.equal(await page.locator('body').evaluate(element=>element.scrollWidth<=innerWidth),true,'Mobile demo horizontal overflow');
  await checkDevicePicker('device-picker-mobile-dark-touch',{touch:true});
  await page.getByRole('button',{name:/切换/}).click();
  await checkDevicePicker('device-picker-mobile-light-touch',{touch:true});
  await page.goto(new URL('/platforms/',base).href,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>!document.querySelector('iframe'));
  assert.equal(page.workers().length,0,'Mobile demo Worker leaked on navigation');
  assert.equal(await page.locator('body').evaluate(element=>element.scrollWidth<=innerWidth),true,'Mobile platform table horizontal overflow');
  await capture('website-mobile-platforms',page);
  checks.push('mobile-canvas-Chinese-input-and-platform-status');
  checks.push('responsive-theme-reduced-motion');
  assert.deepEqual([...unexpectedOrigins],[],'Public site fetched an external dependency');
  assert.deepEqual(errors,[],'Browser errors');
  assert.deepEqual(failedResponses,[],'Failed HTTP assets');
  assert.deepEqual(failedRequests,[],'Failed asset requests');
  checks.push('same-origin-assets-without-failed-requests');
  performanceReport=collectPerformanceReport();
  if(mode==='performance'){
    assert.ok(performanceReport.runtimeHash,'Performance report is missing the active runtime content hash');
    assert.ok(performanceReport.samples.inputToStableFrame>=20,'Performance gate needs at least 20 accepted Canvas input samples; got '+performanceReport.samples.inputToStableFrame);
    assert.ok(performanceReport.samples.hotSceneSwitch>=12,'Performance gate needs at least 12 hot scene switches');
    assert.ok(performanceReport.canvasInputToStableFrame.p95Ms<=100&&performanceReport.canvasInputToStableFrame.p99Ms<=200,'Canvas input latency exceeded the accepted p95/p99 limits');
    assert.ok(performanceReport.hotSceneSwitch.p95Ms<=1500,'Hot scene switch exceeded the accepted p95 limit');
  }
  result = {status:'passed',mode,device:options['--device']||'iphone-duo',headless:true,browser:browser.version(),url:base.href,checks,actions,screenshots,resources,performance:performanceReport,errors,failedResponses,failedRequests,platformInjectedOrigins:[...platformInjectedOrigins]};
} catch(error) {
  await writeFile(resolve(output,'last-action.json'),JSON.stringify(lastAction,null,2)+'\n');
  if(page && !page.isClosed()) {
    const diagnostics=[];
    for(const frame of page.frames().filter(value=>value!==page.mainFrame())) {
      diagnostics.push(await frame.evaluate(()=>({url:location.href,state:document.documentElement.dataset.state,visibility:document.visibilityState,trace:window.__showcaseSmokeTrace,diagnostics:window.__showcaseSmokeDiagnostics,canvases:[...document.querySelectorAll('canvas')].map(value=>({width:value.width,height:value.height})),startup:document.querySelector('#startup')?.textContent,inputEnabled:document.documentElement.dataset.inputEnabled,renderRevision:window.__showcaseSmokeFrameRevision,surface:document.querySelector('canvas')?.getBoundingClientRect().toJSON(),nodes:(()=>{const rows=[];const walk=(n,dx=0,dy=0)=>{if(!n)return;rows.push({id:n.id,text:n.text,attributes:n.attributes,classes:n.classes,bounds:n.bounds&&{...n.bounds,x:n.bounds.x+dx,y:n.bounds.y+dy},scrollOffset:n.scrollOffset});for(const c of n.children||[])walk(c,dx-(n.scrollOffset?.scrollLeft||0),dy-(n.scrollOffset?.scrollTop||0))};walk(window.__showcaseSmokeFrame?.root);return rows})()})).catch(cause=>({error:cause.message})));
      await frame.locator('#surface-root').screenshot({path:resolve(output,'failure-surface.png')}).catch(()=>{});
    }
    await writeFile(resolve(output,'failure-diagnostics.json'),JSON.stringify(diagnostics,null,2)+'\n');
  }
  if(page && !page.isClosed()) await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});
  const nativeInputs=await Promise.all(page.frames().map(value=>value.evaluate(()=>({url:location.href,events:window.__showcaseSmokeNativeInputs})).catch(()=>null)));
  performanceReport ||= collectPerformanceReport();
  result = {status:'failed',mode,headless:true,url:base.href,checks,actions,screenshots,resources,errors,failedResponses,failedRequests,platformInjectedOrigins:[...platformInjectedOrigins],lastAction,nativeInputs,runtimeMeasurements,performance:performanceReport,network:{active:[...activeRequests.values()].map(value=>({...value,durationMs:Date.now()-value.started})),slowRequests},error:{message:error.message,stack:error.stack}};
  process.exitCode = 1;
} finally {
  await context?.close();
  await browser?.close();
  result = {...result,cleanup:{contextClosed:true,browserDisconnected:browser ? !browser.isConnected() : true}};
  await writeFile(resolve(output,'report.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify(result,null,2));
