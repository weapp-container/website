// Isolated browser regression for the browsing-context scroll chain. The real
// runtime smoke separately verifies guest scroll offsets and business actions.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const output=resolve(process.argv[2]||'artifacts/web/scroll-boundary');
const module=await readFile(new URL('../website/shared/showcase-scroll-boundary.mjs',import.meta.url));
const parent=`<!doctype html><style>body{margin:0;height:3000px}#screen{position:absolute;top:500px;left:250px;width:400px;height:300px;overflow:hidden;overscroll-behavior:none}iframe{border:0;width:100%;height:100%}</style>
<div id="screen"><iframe src="/guest"></iframe></div><script type="module">
import {attachShowcaseScrollBoundary as attach} from '/boundary.mjs';
window.release=attach(document.querySelector('#screen'));window.parentWheels=0;
document.querySelector('#screen').addEventListener('wheel',()=>window.parentWheels++);
</script>`;
const guest=`<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;touch-action:none}#startup{position:fixed;inset:0;background:white}#startup[hidden]{display:none}dialog{width:280px;max-height:240px;overflow:auto;overscroll-behavior:contain}textarea{width:250px;height:100px;overscroll-behavior:contain}</style>
<canvas></canvas><div id="startup" hidden>Loading</div><dialog><textarea></textarea></dialog>
<script type="module">
import {attachShowcaseScrollBoundary as attach} from '/boundary.mjs';
window.release=attach(document.documentElement,{nativeScroll:'dialog[open]'});
window.inputEnabled=true;window.guestWheels=0;window.observedWheels=0;window.drags=0;
document.querySelector('canvas').addEventListener('wheel',e=>{if(!window.inputEnabled||e.ctrlKey)return;e.preventDefault();window.guestWheels++},{passive:false});
document.querySelector('canvas').addEventListener('pointerup',()=>window.drags++);
document.addEventListener('wheel',()=>window.observedWheels++);
</script>`;
const server=createServer((request,response)=>{
  const body=request.url==='/boundary.mjs'?module:request.url==='/guest'?guest:parent;
  response.writeHead(200,{'content-type':request.url==='/boundary.mjs'?'text/javascript':'text/html'});response.end(body);
});
let browser,context,result;
const checks=[];
try {
  server.listen(0,'127.0.0.1');await once(server,'listening');
  browser=await chromium.launch({channel:process.env.SHOWCASE_BROWSER_CHANNEL||'chrome',headless:true});
  context=await browser.newContext({viewport:{width:1000,height:800},hasTouch:true});
  const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const frame=await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>typeof window.release==='function');
  await page.evaluate(()=>scrollTo(0,350));
  await page.mouse.move(450,300);
  const wheel=async(delta=100)=>{await page.mouse.wheel(0,delta);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>scrollY),350,'Wheel escaped screen');};
  await wheel();assert.equal(await frame.evaluate(()=>window.guestWheels),1);
  checks.push('active-input-reaches-canvas-without-outer-scroll');
  await frame.evaluate(()=>{window.inputEnabled=false;});await wheel();
  assert.equal(await frame.evaluate(()=>window.guestWheels),1);
  assert.equal(await frame.evaluate(()=>window.observedWheels),2,'Wheel propagation was stopped');
  checks.push('paused-input-stays-contained-and-propagates');
  await frame.locator('#startup').evaluate(element=>{element.hidden=false;});await wheel();
  checks.push('loading-overlay-stays-contained');
  await page.locator('iframe').evaluate(element=>{element.style.pointerEvents='none';element.inert=true;});
  await wheel();assert.ok(await page.evaluate(()=>window.parentWheels)>0);
  checks.push('inert-iframe-scene-rotation-restart-gap-stays-contained');
  await page.locator('iframe').evaluate(element=>{element.style.pointerEvents='';element.inert=false;});
  await frame.evaluate(()=>{
    document.querySelector('#startup').hidden=true;
    const field=document.querySelector('textarea');field.value=Array.from({length:100},(_,i)=>'Native text line '+i).join('\n');
    document.querySelector('dialog').showModal();field.scrollTop=0;
  });
  await page.waitForTimeout(650);
  await frame.locator('textarea').hover();await wheel();
  assert.ok(await frame.locator('textarea').evaluate(element=>element.scrollTop)>0,'Native editor cannot scroll');
  await frame.locator('textarea').evaluate(element=>{element.scrollTop=element.scrollHeight;});await wheel();
  await frame.locator('textarea').evaluate(element=>{element.scrollTop=0;});await wheel(-100);
  checks.push('native-editor-scrolls-internally-and-contains-both-edges');
  await frame.evaluate(()=>{document.querySelector('dialog').close();window.inputEnabled=true;});
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:450,y:350}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:450,y:250}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate(()=>scrollY),350);
  assert.equal(await frame.evaluate(()=>window.drags),1,'Touch pointer lifecycle was interrupted');
  checks.push('touch-drag-keeps-canvas-pointer-lifecycle');
  await frame.evaluate(()=>{const field=document.querySelector('textarea');field.scrollTop=0;document.querySelector('dialog').showModal();});
  const editorBox=await frame.locator('textarea').boundingBox();
  const editorPoint={x:editorBox.x+editorBox.width/2,y:editorBox.y+editorBox.height-10};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[editorPoint]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:editorPoint.x,y:editorPoint.y-60}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await frame.locator('textarea').evaluate(element=>element.scrollTop)>0,'Touch scroll inside the native editor was blocked');
  assert.equal(await page.evaluate(()=>scrollY),350,'Touch editor scroll escaped to outer page');
  checks.push('native-editor-touch-scroll-remains-available');
  await frame.evaluate(()=>document.querySelector('dialog').close());
  await page.waitForTimeout(650);await page.mouse.move(30,300);await page.mouse.wheel(0,100);await page.waitForTimeout(250);
  assert.ok(await page.evaluate(()=>scrollY)>350,'Outer page was globally locked');
  checks.push('outside-screen-still-scrolls');
  await page.waitForTimeout(650);await page.evaluate(()=>scrollTo(0,350));await page.mouse.move(450,300);
  await frame.evaluate(()=>{window.release();window.release();window.inputEnabled=false;});
  await page.mouse.wheel(0,100);await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>scrollY),350,'Parent boundary must cover the retired iframe listener');
  checks.push('iframe-cleanup-reproduces-original-scroll-chain');
  result={status:'passed',headless:true,browser:browser.version(),checks};
} catch(error) { result={status:'failed',headless:true,checks,error:{message:error.message,stack:error.stack}};process.exitCode=1; }
finally {
  await context?.close();await browser?.close();await new Promise(accept=>server.close(accept));
  result={...result,cleanup:{contextClosed:true,browserDisconnected:browser?!browser.isConnected():true,serverClosed:!server.listening}};
  await mkdir(output,{recursive:true});await writeFile(resolve(output,'report.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify(result,null,2));
