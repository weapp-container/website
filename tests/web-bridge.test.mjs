import test from 'node:test';
import assert from 'node:assert/strict';
import {createShowcaseBridge} from '../website/runtime/showcase-bridge.mjs';

const ready = id => ({type:'showcase.state.ready',protocolVersion:1,sessionId:id});
const text = (id,pageId=1) => ({type:'showcase.text.request',protocolVersion:1,sessionId:id,pageId,requestId:`r-${pageId}`,field:'search',title:'搜索商品',value:'',maxLength:80,multiline:false});
test('readiness waits for actual restore completion and retires prior owners',async()=>{
  const pending=[],seen=[];const bridge=createShowcaseBridge({send:value=>new Promise(resolve=>pending.push({value,resolve})),readState:()=>null,writeState(){},showText(){},hideText(){},onReady:()=>seen.push('ready')});
  const old=bridge.receive(ready('old'));assert.deepEqual(seen,[]);
  const current=bridge.receive(ready('current'));pending[0].resolve();await old;assert.deepEqual(seen,[]);
  pending[1].resolve();await current;assert.deepEqual(seen,['ready']);
  const closed=bridge.receive(ready('closed'));bridge.close();pending[2].resolve();await closed;assert.deepEqual(seen,['ready']);
});
function harness(raw=null){const sent=[],shown=[];let saved=raw,hidden=0;const bridge=createShowcaseBridge({send:async value=>sent.push(value),readState:()=>saved,writeState:value=>{saved=value},showText:value=>shown.push(value),hideText:()=>hidden++});return {bridge,sent,shown,get saved(){return saved},get hidden(){return hidden}}}
test('restores at most once per guest owner and rejects prior-owner state',async()=>{const h=harness(JSON.stringify({schemaVersion:1,cart:[]}));await h.bridge.receive(ready('a'));await h.bridge.receive(ready('a'));assert.equal(h.sent.length,1);assert.deepEqual(h.sent[0].state,{schemaVersion:1,cart:[]});await h.bridge.receive(ready('b'));assert.equal(await h.bridge.receive({type:'showcase.state.changed',protocolVersion:1,sessionId:'a',state:{schemaVersion:1,cart:['stale']}}),false);assert.equal(JSON.parse(h.saved).cart.length,0)});
test('real text result preserves owner and page request identity and is single use',async()=>{const h=harness();await h.bridge.receive(ready('a'));await h.bridge.receive(text('a',3));await h.bridge.commit('陶瓷杯');assert.deepEqual(h.sent.at(-1),{type:'showcase.text.commit',protocolVersion:1,sessionId:'a',pageId:3,requestId:'r-3',value:'陶瓷杯'});assert.equal(await h.bridge.commit('late'),false)});
test('scene requests use the restored guest identity and accept only the matching single acknowledgment',async()=>{
  const h=harness();await h.bridge.receive(ready('a'))
  const pending=h.bridge.requestScene('order','scene-1',1000)
  assert.deepEqual(h.sent.at(-1),{type:'showcase.scene.request',protocolVersion:1,sessionId:'a',requestId:'scene-1',scene:'order'})
  assert.equal(await h.bridge.receive({type:'showcase.scene.ack',protocolVersion:1,sessionId:'old',requestId:'scene-1',scene:'order',status:'committed'}),false)
  assert.equal(await h.bridge.receive({type:'showcase.scene.ack',protocolVersion:1,sessionId:'a',requestId:'other',scene:'order',status:'committed'}),false)
  await h.bridge.receive({type:'showcase.scene.ack',protocolVersion:1,sessionId:'a',requestId:'scene-1',scene:'order',status:'committed'})
  assert.equal((await pending).status,'committed')
  await assert.rejects(h.bridge.requestScene('anything','scene-2'),{code:'ERR_SHOWCASE_SCENE'})
});
test('page dismissal and owner close discard editor results',async()=>{const h=harness();await h.bridge.receive(ready('a'));await h.bridge.receive(text('a'));await h.bridge.receive({...text('a'),type:'showcase.text.dismiss'});assert.equal(await h.bridge.commit('late'),false);await h.bridge.receive(text('a',2));h.bridge.close();assert.equal(await h.bridge.cancel(),false);assert.equal(await h.bridge.receive(text('a',3)),false)});
test('corrupt storage restores defaults and oversized/foreign messages are rejected',async()=>{const h=harness('{broken');await h.bridge.receive(ready('a'));assert.equal(h.sent[0].state,null);assert.equal(await h.bridge.receive({...text('a'),field:'arbitraryNativeOperation'}),false);assert.equal(await h.bridge.receive({type:'showcase.state.changed',protocolVersion:1,sessionId:'a',state:{schemaVersion:1,value:'x'.repeat(130*1024)}}),false);assert.equal(h.saved,'{broken')});

test('guest close belongs to the current ready session and retires its editor exactly once',async()=>{
  const closed=[],hidden=[],saved=[];const bridge=createShowcaseBridge({send:async()=>{},readState:()=>null,writeState:value=>saved.push(value),showText(){},hideText:()=>hidden.push(true),onClose:()=>closed.push(true)});
  const close=id=>({type:'showcase.close.request',protocolVersion:1,sessionId:id});
  assert.equal(await bridge.receive(close('a')),false);await bridge.receive(ready('a'));await bridge.receive(text('a'));
  assert.equal(await bridge.receive(close('other')),false);
  await bridge.receive({type:'showcase.state.changed',protocolVersion:1,sessionId:'a',state:{schemaVersion:1,cart:[]}});
  assert.equal(await bridge.receive(close('a')),true);assert.equal(saved.length,1);assert.equal(closed.length,1);assert.equal(await bridge.commit('stale'),false);assert.equal(await bridge.receive(close('a')),false);
  bridge.close();assert.equal(await bridge.receive(close('a')),false);
});
