import test from 'node:test';
import assert from 'node:assert/strict';
import {DEVICE_REGISTRY,parseRuntimeSelection,renderScaleForDisplay,runtimeSelectionSearch} from '../website/shared/showcase-devices.mjs';
import {createDensityController,waitForRenderScalePresentation} from '../website/runtime/showcase-density-controller.mjs';

function animationClock() {
  let serial = 0, time = 0; const callbacks = new Map();
  return {schedule:callback=>{callbacks.set(++serial,callback);return serial;},cancel:id=>callbacks.delete(id),now:()=>time,
    advance(ms=16){time+=ms;const pending=[...callbacks.values()];callbacks.clear();for(const callback of pending)callback();},get pending(){return callbacks.size;}};
}

test('runtime density links accept only canonical auto, 1x, 1.5x and 2x values',()=>{
  const selection=DEVICE_REGISTRY.defaultSelection;
  assert.deepEqual(parseRuntimeSelection('',DEVICE_REGISTRY),{scene:'shop',selection,renderScale:'auto'});
  assert.deepEqual(parseRuntimeSelection('?scene=basic&renderScale=1.5',DEVICE_REGISTRY),{scene:'basic',selection,renderScale:1.5});
  assert.equal(parseRuntimeSelection('?renderScale=auto',DEVICE_REGISTRY).renderScale,'auto');
  assert.equal(runtimeSelectionSearch('order',selection,2,DEVICE_REGISTRY),`?scene=order&device=${selection.device}&display=${selection.display}&rotation=0&renderScale=2`);
  for(const query of ['?renderScale=','?renderScale=01','?renderScale=1.0','?renderScale=2.0','?renderScale=3','?renderScale=NaN','?renderScale=1&renderScale=2','?renderScale=2&unknown=x']) {
    assert.throws(()=>parseRuntimeSelection(query,DEVICE_REGISTRY),{code:'ERR_SHOWCASE_DEVICE'},query);
  }
});

test('adaptive density follows rendered physical size while preserving the simulated device density',()=>{
  assert.equal(renderScaleForDisplay(.766,2),1.5);
  assert.equal(renderScaleForDisplay(.375,2),1);
  assert.equal(renderScaleForDisplay(.5,3),1.5);
  assert.equal(renderScaleForDisplay(.7,3),2);
  assert.equal(renderScaleForDisplay(.25,8),2);
  assert.throws(()=>renderScaleForDisplay(0,2),{code:'ERR_SHOWCASE_DEVICE'});
  assert.throws(()=>renderScaleForDisplay(1,9),{code:'ERR_SHOWCASE_DEVICE'});
});

test('density changes acknowledge only after a newer accepted observation remains stable',async()=>{
  const clock=animationClock(),source={},origin='https://showcase.invalid',posts=[],transitions=[];
  const state={inputEnabled:true,presentation:{accepted:{inputEnabled:true,proof:{publication:{kind:'external-frame',renderRevision:'9'}}}},observation:{sequence:'9'}};
  let scaleCalls=0;
  const session={status:state,async setRenderScale(scale){scaleCalls++;assert.equal(scale,1.5);}};
  const controller=createDensityController({initialScale:1,getSession:()=>session,
    waitForPresentation:options=>waitForRenderScalePresentation({...clock,getStatus:()=>state,...options}),
    post:value=>posts.push(value),origin,source,onTransition:value=>transitions.push(value)});
  const event=(requestId,renderScale=1.5)=>({source,origin,data:{type:'showcase.render-scale.request',schemaVersion:1,requestId,renderScale}});
  const work=controller.receive(event('density-1'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(scaleCalls,1);assert.equal(posts.length,0);assert.equal(controller.busy,true);
  clock.advance();assert.equal(posts.length,0);
  state.presentation.accepted.proof.publication.renderRevision='10';clock.advance();assert.equal(posts.length,0);
  clock.advance();await Promise.resolve();assert.equal(posts.length,1);
  assert.deepEqual(posts[0],{type:'showcase.render-scale.ack',schemaVersion:1,requestId:'density-1',renderScale:1.5,status:'committed'});
  assert.equal(await work,true);assert.equal(controller.scale,1.5);assert.deepEqual(transitions,[true,false]);assert.equal(clock.pending,0);
});

test('duplicate, foreign, malformed and concurrent requests cannot mutate density twice',async()=>{
  const clock=animationClock(),source={},origin='https://showcase.invalid',posts=[];
  const state={inputEnabled:true,presentation:{accepted:{inputEnabled:true,proof:{publication:{kind:'external-frame',renderRevision:'1'}}}},observation:{sequence:1}};
  let resolveScale,scaleCalls=0;
  const session={status:state,setRenderScale(){scaleCalls++;return new Promise(resolve=>{resolveScale=resolve;});}};
  const controller=createDensityController({initialScale:1,getSession:()=>session,waitForPresentation:options=>waitForRenderScalePresentation({...clock,getStatus:()=>state,...options}),post:value=>posts.push(value),origin,source});
  const event=(requestId,renderScale=1.5)=>({source,origin,data:{type:'showcase.render-scale.request',schemaVersion:1,requestId,renderScale}});
  assert.equal(await controller.receive({...event('foreign'),origin:'https://other.invalid'}),false);
  assert.equal(await controller.receive({...event('foreign-source'),source:{}}),false);
  const malformed=event('bad');malformed.data.extra=true;
  assert.equal(await controller.receive(malformed),false);assert.equal(posts.at(-1).code,'ERR_SHOWCASE_RENDER_SCALE');
  const first=controller.receive(event('first'));
  assert.equal(await controller.receive(event('first')),false);
  assert.equal(await controller.receive(event('second',2)),false);
  assert.equal(posts.at(-1).requestId,'second');assert.equal(posts.at(-1).code,'ERR_SHOWCASE_RENDER_SCALE_BUSY');assert.equal(scaleCalls,1);
  resolveScale();await Promise.resolve();await Promise.resolve();
  state.presentation.accepted.proof.publication.renderRevision='2';clock.advance();clock.advance();
  assert.equal(await first,true);assert.equal(controller.scale,1.5);
  assert.equal(await controller.receive(event('already-applied',1.5)),true);
  assert.equal(scaleCalls,1);
});

test('presentation waits fail on timeout, runtime fault and owner shutdown',async()=>{
  const clock=animationClock(),abort=new AbortController();
  const args={...clock,getStatus:()=>({inputEnabled:false}),afterRenderRevision:'1'};
  const timeout=waitForRenderScalePresentation({...args,timeoutMs:20});clock.advance(21);
  await assert.rejects(timeout,{code:'ERR_SHOWCASE_RENDER_SCALE_TIMEOUT'});assert.equal(clock.pending,0);
  const failed=waitForRenderScalePresentation({...args,getStatus:()=>({fault:{code:'ERR_RENDER'}})});clock.advance();
  await assert.rejects(failed,{code:'ERR_RENDER'});assert.equal(clock.pending,0);
  const closed=waitForRenderScalePresentation({...args,signal:abort.signal});abort.abort();
  await assert.rejects(closed,{code:'ERR_CANCELLED'});assert.equal(clock.pending,0);
});

test('closing aborts an active density transaction and suppresses late acknowledgements',async()=>{
  const source={},origin='https://showcase.invalid',posts=[];let release;
  const state={inputEnabled:true,presentation:{accepted:{inputEnabled:true,proof:{publication:{kind:'external-frame',renderRevision:'1'}}}},observation:{sequence:1}};
  const controller=createDensityController({initialScale:1,getSession:()=>({status:state,setRenderScale:()=>new Promise(resolve=>{release=resolve;})}),
    waitForPresentation:({signal})=>signal.aborted?Promise.reject(Object.assign(new Error('closed'),{code:'ERR_CANCELLED'})):new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('closed'),{code:'ERR_CANCELLED'})),{once:true})),
    post:value=>posts.push(value),origin,source});
  const work=controller.receive({source,origin,data:{type:'showcase.render-scale.request',schemaVersion:1,requestId:'close',renderScale:2}});
  await Promise.resolve();await Promise.resolve();controller.close();release();
  assert.equal(await work,false);assert.equal(posts.length,0);assert.equal(controller.busy,false);
});
