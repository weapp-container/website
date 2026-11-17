import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneController,waitForScenePresentation} from '../website/runtime/showcase-scene-controller.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function clock(){let id=0,time=0;const callbacks=new Map();return {schedule:fn=>{callbacks.set(++id,fn);return id;},cancel:key=>callbacks.delete(key),now:()=>time,advance(ms=16){time+=ms;const batch=[...callbacks.values()];callbacks.clear();for(const fn of batch)fn();},get pending(){return callbacks.size;}};}
function fixture(){
  const source={},origin='https://showcase.invalid',posts=[],transitions=[],scenes=[],ack=deferred(),presented=deferred();
  const session={status:{observation:{sequence:1},inputEnabled:true,presentation:{accepted:{inputEnabled:true}}}};
  const bridge={requestScene:()=>ack.promise};
  const controller=createSceneController({initialScene:'shop',getSession:()=>session,getBridge:()=>bridge,waitForPresentation:async()=>{await presented.promise;session.status.observation.sequence=2;},post:value=>posts.push(value),origin,source,setScene:value=>scenes.push(value),onTransition:value=>transitions.push(value)});
  const event=(requestId='scene-1',scene='order')=>({source,origin,data:{type:'showcase.scene.request',schemaVersion:1,requestId,scene}});
  return {controller,session,source,origin,posts,transitions,scenes,ack,presented,event};
}
test('scene changes retain one owner and commit only after a stable presentation',async()=>{
  const f=fixture(),work=f.controller.receive(f.event());
  assert.equal(f.controller.busy,true);assert.equal(f.controller.scene,'shop');assert.deepEqual(f.scenes,[]);assert.equal(f.posts.length,0);
  f.ack.resolve({requestId:'scene-1',scene:'order',status:'committed'});await Promise.resolve();
  assert.equal(f.posts.length,0);assert.deepEqual(f.transitions,[true]);
  f.presented.resolve();assert.equal(await work,true);
  assert.equal(f.controller.scene,'order');assert.deepEqual(f.scenes,['order']);
  assert.deepEqual(f.posts.at(-1),{type:'showcase.scene.ack',schemaVersion:1,requestId:'scene-1',scene:'order',status:'committed'});
  assert.deepEqual(f.transitions,[true,false]);assert.equal(f.controller.busy,false);
});
test('foreign owners, malformed or duplicate requests and concurrent scene changes are rejected',async()=>{
  const f=fixture();
  assert.equal(await f.controller.receive({...f.event('other-origin'),origin:'https://foreign.invalid'}),false);
  assert.equal(await f.controller.receive({...f.event('other-source'),source:{}}),false);
  const injected=f.event('injected');injected.data.extra='https://bad.invalid';assert.equal(await f.controller.receive(injected),false);
  const first=f.controller.receive(f.event('first'));
  assert.equal(await f.controller.receive(f.event('second','basic')),false);assert.equal(f.posts.at(-1).code,'ERR_SHOWCASE_SCENE_BUSY');
  assert.equal(await f.controller.receive(f.event('first')),false);
  f.ack.resolve({requestId:'first',scene:'order',status:'committed'});f.presented.resolve();await first;
});
test('scene presentation waits for a new accepted observation and two stable ticks',async()=>{
  const c=clock(),abort=new AbortController(),state={inputEnabled:true,presentation:{accepted:{inputEnabled:true}},observation:{sequence:4}};
  let settled=false;const work=waitForScenePresentation({...c,getStatus:()=>state,signal:abort.signal,afterSequence:4}).then(()=>{settled=true;});
  c.advance();assert.equal(settled,false);state.observation.sequence=5;c.advance();assert.equal(settled,false);c.advance();await work;assert.equal(settled,true);assert.equal(c.pending,0);
});
test('scene presentation treats u64 observation sequences numerically across decimal boundaries',async()=>{
  const c=clock(),state={inputEnabled:true,presentation:{accepted:{inputEnabled:true}},observation:{sequence:'9'}};
  let settled=false;const work=waitForScenePresentation({...c,getStatus:()=>state,afterSequence:'9'}).then(()=>{settled=true;});
  c.advance();assert.equal(settled,false);state.observation.sequence='10';c.advance();assert.equal(settled,false);c.advance();await work;assert.equal(settled,true);assert.equal(c.pending,0);
});
test('scene presentation fails closed on runtime faults, timeout and owner shutdown',async()=>{
  const c=clock(),abort=new AbortController();
  const fault=waitForScenePresentation({...c,getStatus:()=>({fault:{code:'ERR_RENDER'}})});c.advance();await assert.rejects(fault,{code:'ERR_RENDER'});assert.equal(c.pending,0);
  const timeout=waitForScenePresentation({...c,getStatus:()=>({}),timeoutMs:20});c.advance(21);await assert.rejects(timeout,{code:'ERR_SHOWCASE_SCENE_TIMEOUT'});assert.equal(c.pending,0);
  const closed=waitForScenePresentation({...c,getStatus:()=>({}),signal:abort.signal});abort.abort();await assert.rejects(closed,{code:'ERR_CANCELLED'});assert.equal(c.pending,0);
});
