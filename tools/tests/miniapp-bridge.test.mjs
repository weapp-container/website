import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {createShowcase}=require('../../miniapp/lib/bridge.js')
function fixture(){
  const sent=[],saved=[],listeners=new Set()
  const transport={postMessage:message=>sent.push(message),onMessage:fn=>listeners.add(fn),offMessage:fn=>listeners.delete(fn)}
  const runtime=createShowcase({transport,sessionId:'session-a',storage:{get:()=>null,set:(key,state)=>saved.push(state)}})
  const deliver=message=>runtime.receive({protocolVersion:1,sessionId:'session-a',...message})
  return {runtime,sent,saved,listeners,deliver}
}
test('state restore applies once and a late restore cannot erase user edits',()=>{
  const f=fixture();f.runtime.ready()
  assert.equal(f.sent[0].type,'showcase.state.ready')
  assert.equal(f.deliver({type:'showcase.state.restore',sessionId:'old',state:{schemaVersion:1}}),false)
  assert.equal(f.deliver({type:'showcase.state.restore',state:{schemaVersion:1,cart:[{id:'bag',spec:0,quantity:2}]}}),true)
  assert.equal(f.runtime.model.totals('shop').quantity,2)
  assert.equal(f.deliver({type:'showcase.state.restore',state:null}),false)
  const second=fixture();second.runtime.model.add('food','coffee')
  assert.equal(second.deliver({type:'showcase.state.restore',state:{schemaVersion:1}}),false)
  assert.equal(second.runtime.model.totals('food').quantity,1)
  assert.equal(second.sent.at(-1).type,'showcase.state.changed');assert.equal(second.saved.length,1)
})
test('Chinese commit belongs to exact session, page and request and commits only once',()=>{
  const f=fixture(),values=[]
  f.runtime.text({field:'search',title:'搜索',value:'',maxLength:40,commit:value=>values.push(value)})
  const request=f.sent.at(-1)
  for(const changed of [{sessionId:'old'},{pageId:99},{requestId:'wrong'}])assert.equal(f.deliver({...request,type:'showcase.text.commit',value:'陶瓷杯',...changed}),false)
  assert.equal(f.deliver({...request,type:'showcase.text.commit',value:'陶瓷杯'}),true)
  assert.deepEqual(values,['陶瓷杯'])
  assert.equal(f.deliver({...request,type:'showcase.text.commit',value:'again'}),false)
})
test('screen navigation, cancel, replacement and close retire native text requests',()=>{
  const f=fixture(),values=[]
  const open=()=>f.runtime.text({field:'food.note',title:'备注',value:'',maxLength:4,commit:value=>values.push(value)})
  open();const old=f.sent.at(-1);f.runtime.page()
  assert.equal(f.sent.at(-1).type,'showcase.text.dismiss')
  assert.equal(f.deliver({...old,type:'showcase.text.commit',value:'失效'}),false)
  open();const cancelled=f.sent.at(-1);f.deliver({...cancelled,type:'showcase.text.cancel'})
  assert.deepEqual(values,[])
  open();const replaced=f.sent.at(-1);open();assert.equal(f.deliver({...replaced,type:'showcase.text.commit',value:'失效'}),false)
  const latest=f.sent.at(-1);f.deliver({...latest,type:'showcase.text.commit',value:'不要香菜谢谢'})
  assert.deepEqual(values,['不要香菜'])
  open();f.runtime.close();assert.equal(f.listeners.size,0)
  assert.equal(f.deliver({...f.sent.at(-2),type:'showcase.text.commit',value:'关闭'}),false)
})
test('scene requests use the current session, allowlisted targets and a single page owner',async()=>{
  const f=fixture(),calls=[];f.runtime.onSceneRequest(async scene=>{calls.push(scene);return true})
  const request={protocolVersion:1,sessionId:'session-a',type:'showcase.scene.request',requestId:'scene-1',scene:'order'}
  assert.equal(f.deliver({...request,sessionId:'old'}),false)
  assert.equal(f.deliver({...request,scene:'https://example.test'}),false)
  assert.equal(f.deliver({...request,extra:'ignored'}),false)
  assert.equal(f.deliver(request),true)
  assert.equal(f.deliver(request),false)
  await new Promise(resolve=>setImmediate(resolve))
  assert.deepEqual(calls,['order'])
  assert.deepEqual(f.sent.at(-1),{...request,type:'showcase.scene.ack',status:'committed'})
  f.runtime.close()
  assert.equal(f.deliver({...request,requestId:'scene-2'}),false)
})
test('no host bridge leaves business usable and reports unavailable text editing',()=>{
  const runtime=createShowcase({sessionId:'offline'})
  assert.equal(runtime.text({field:'search',title:'Search',value:'',commit:()=>{throw new Error('unexpected')}}),false)
  runtime.model.add('shop','mug');assert.equal(runtime.model.totals('shop').total,8900)
})
