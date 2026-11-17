import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){assert.ok(['--url','--output','--device'].includes(args[i])&&args[i+1]&&!options[args[i]]);options[args[i]]=args[i+1];}
const url=new URL('/demo/?scene=shop',options['--url']||'http://127.0.0.1:4325');
if(options['--device'])url.searchParams.set('device',options['--device']);
const output=resolve(options['--output']||'artifacts/web/scroll-performance');
await mkdir(output,{recursive:true});
let browser,context,result,profiler,page,frame;
const errors=[];
const quantile=(values,p)=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]:null;};
try{
  browser=await chromium.launch({channel:process.env.SHOWCASE_BROWSER_CHANNEL||'chrome',headless:true});
  context=await browser.newContext({viewport:{width:1365,height:1100},deviceScaleFactor:Number(process.env.SHOWCASE_DEVICE_SCALE_FACTOR||2),reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;
    const data={active:false,wheels:0,inputBatches:0,acks:[],raf:[],longTasks:[],frame:null,lastRevision:null,errors:[]};
    Object.defineProperty(window,'__scrollMeasurement',{value:data});
    document.addEventListener('wheel',event=>{if(data.active&&event.target.tagName==='CANVAS')data.wheels++;},{capture:true,passive:true});
    try{new PerformanceObserver(list=>{if(data.active)for(const entry of list.getEntries())data.longTasks.push({at:entry.startTime,durationMs:entry.duration});}).observe({type:'longtask'});}catch{}
    window.Worker=class extends NativeWorker{
      constructor(...args){super(...args);this.addEventListener('message',event=>{
        const message=event.data,payload=message?.payload;
        if(message?.op==="fault"||payload?.status==="error")data.errors.push(message);
        if(!(payload?.status==='ok'||payload?.ok===true))return;
        const value=payload.result??payload;
        if(['frame','frame.current'].includes(message.op)&&value.frame)data.frame=value.frame;
        if(message.op==='ack'&&value.acknowledged===true&&value.renderRevision!==data.lastRevision){
          data.lastRevision=value.renderRevision;
          if(data.active)data.acks.push({at:performance.now(),revision:value.renderRevision});
        }
      });}
      postMessage(message,...rest){if(data.active&&message.op==='bridge'&&message.payload?.envelope?.op==='event.batch')data.inputBatches++;return super.postMessage(message,...rest);}
    };
  });
  page=await context.newPage();
  page.on("pageerror",error=>errors.push(error.message));
  page.on("requestfailed",request=>errors.push({url:request.url(),failure:request.failure()}));
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:90000});
  const iframe=await page.locator('iframe[title$="交互演示"]').elementHandle();
  assert.ok(iframe,'Missing demonstration frame');
  frame=await iframe.contentFrame();assert.ok(frame);
  await frame.waitForFunction(()=>document.documentElement.dataset.state==='error'||document.documentElement.dataset.state==='ready'&&document.documentElement.dataset.inputEnabled==='true'&&window.__scrollMeasurement?.frame,null,{timeout:180000});
  assert.equal(await frame.evaluate(()=>document.documentElement.dataset.state),'ready','Runtime startup failed');
  const location=await frame.evaluate(()=>{
    const data=window.__scrollMeasurement,root=data.frame.root;
    const find=node=>node.classes?.includes('body')?node:(node.children||[]).map(find).find(Boolean);
    const body=find(root),canvas=document.querySelector('canvas'),rect=canvas.getBoundingClientRect(),viewport=data.frame.viewport;
    if(!body)throw Error('Missing genuine scroll body');
    return {x:(body.bounds.x+body.bounds.width/2)*rect.width/viewport.width,y:(body.bounds.y+Math.min(150,body.bounds.height/2))*rect.height/viewport.height};
  });
  await frame.locator('canvas').hover({position:location});
  const baseline=await frame.evaluate(async()=>{
    const times=[];await new Promise(done=>{const tick=at=>{times.push(at);if(times.length<31)requestAnimationFrame(tick);else done();};requestAnimationFrame(tick);});
    return times.slice(1).map((at,i)=>at-times[i]);
  });
  if(process.env.SHOWCASE_CPU_PROFILE==='1'){
    profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');
  }
  await frame.evaluate(()=>{
    const data=window.__scrollMeasurement;data.active=true;data.startedAt=performance.now();
    data.heapBefore=performance.memory?.usedJSHeapSize??null;
    const tick=at=>{if(!data.active)return;data.raf.push(at);requestAnimationFrame(tick);};requestAnimationFrame(tick);
  });
  // Genuine wheel events, small alternating runs keep the same scroll region
  // away from its clamp. No guest handler or runtime state is invoked.
  for(let index=0;index<180;index++){
    await page.mouse.wheel(0,Math.floor(index/15)%2===0?12:-12);
    await page.waitForTimeout(16);
  }
  const sample=await frame.evaluate(()=>{
    const data=window.__scrollMeasurement;data.endedAt=performance.now();data.active=false;
    const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),extension=gl?.getExtension('WEBGL_debug_renderer_info');
    return {startedAt:data.startedAt,endedAt:data.endedAt,wheels:data.wheels,inputBatches:data.inputBatches,acks:data.acks,raf:data.raf,longTasks:data.longTasks,
      heapBefore:data.heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,
      viewport:data.frame.viewport,physicalSize:{width:canvas.width,height:canvas.height},dpr:devicePixelRatio,
      graphics:gl?{vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),unmaskedRenderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null,contextLost:gl.isContextLost()}:null};
  });
  if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile(resolve(output,'main-thread.cpuprofile'),JSON.stringify(profile));await profiler.detach();profiler=null;}
  const durationMs=sample.endedAt-sample.startedAt,intervals=sample.raf.slice(1).map((at,i)=>at-sample.raf[i]);
  const budgetMs=quantile(baseline,.5),missed=intervals.reduce((sum,value)=>sum+Math.max(0,Math.round(value/budgetMs)-1),0);
  assert.ok(sample.graphics&&!sample.graphics.contextLost,'Actual WebGL2 context unavailable');
  assert.equal(sample.physicalSize.width,Math.round(sample.viewport.width*sample.dpr));
  assert.equal(sample.physicalSize.height,Math.round(sample.viewport.height*sample.dpr));
  assert.equal(sample.wheels,180,'Native wheel events missed the live canvas');
  assert.ok(sample.acks.length>0,'No updated frame was acknowledged during scrolling');
  await frame.locator('#surface-root').screenshot({path:resolve(output,'scroll.png')});
  result={schemaVersion:1,status:'measured',url:url.href,runtimeURL:frame.url(),browser:{version:browser.version(),headless:true},
    durationMs,hostRaf:{sampleCount:intervals.length,baselineIntervalMs:budgetMs,p50Ms:quantile(intervals,.5),p95Ms:quantile(intervals,.95),p99Ms:quantile(intervals,.99),
      callbacksPerSecond:sample.raf.length*1000/durationMs,missedIntervals:missed,missedIntervalRate:missed/(intervals.length+missed)},
    presentation:{acknowledgedUpdates:sample.acks.length,acknowledgedUpdatesPerSecond:sample.acks.length*1000/durationMs,displayScanoutFps:null,gpuCompletion:'not-waited'},
    scope:'Real browser wheel, RAF cadence, distinct post-swap runtime ACKs and JS heap. ACK update rate is not display scanout FPS; heap excludes WASM/GPU/native allocations. No native SDK/device performance claim.',sample};
}catch(error){process.exitCode=1;result={status:'failed',error:{message:error.message,stack:error.stack},errors,state:await frame?.evaluate(()=>({url:location.href,dataset:{...document.documentElement.dataset},text:document.body.innerText,measurement:window.__scrollMeasurement})).catch(()=>null)};}
finally{
  const cleanup={contextClosed:false,browserDisconnected:false};
  try{if(context)await context.close();cleanup.contextClosed=true;}catch(error){cleanup.contextError=error.message;process.exitCode=1;}
  try{if(browser)await browser.close();cleanup.browserDisconnected=!browser?.isConnected();}catch(error){cleanup.browserError=error.message;process.exitCode=1;}
  result={...result,cleanup};await writeFile(resolve(output,'report.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({...result,sample:result.sample?{...result.sample,raf:undefined,acks:undefined}:undefined},null,2));
}
