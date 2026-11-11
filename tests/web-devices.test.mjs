import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {devices as browserDevices} from 'playwright';
import {DEVICE_REGISTRY,validateDeviceRegistry,parseDeviceSelection,selectionSearch,deviceGeometry,fitDeviceScale,parseDeviceRequest,validateHostLayout,unobstructedRect} from '../website/shared/showcase-devices.mjs';
import {createDeviceController} from '../website/runtime/showcase-device-controller.mjs';
import {waitForDevicePresentation} from '../website/runtime/showcase-presentation.mjs';
import {requestShowcaseOwner} from '../website/shared/showcase-owner-channel.mjs';

// Synthetic measurements deliberately use unrelated sizes, not inferred device
// specifications. Current safe insets and fixed coordinate rectangles differ.
const sample = (width,height) => ({hostLayout:{version:1,safeInsets:{top:20,right:0,bottom:20,left:0},verticalBarEdge:'none',reservedRegions:[]},width,height,pixelRatio:3,statusBarHeight:20,safeArea:{top:20,right:0,bottom:20,left:0},orientation:width>height?'landscape':'portrait',screenFixed:{width,height},metricsSafeArea:{left:0,top:20,right:width,bottom:height-20,width,height:height-40}});
const fixture = () => ({schemaVersion:1,defaultSelection:{device:'fold',display:'inner',rotation:0},devices:[
  {id:'fold',label:'Fold fixture',defaultDisplay:'inner',displays:[
    {id:'inner',label:'Inner',source:{status:'verified'},measurements:{'0':{...sample(1000,600),hostLayout:{version:1,safeInsets:{top:0,right:40,bottom:20,left:0},verticalBarEdge:'right',reservedRegions:[]},safeArea:{top:0,right:40,bottom:20,left:0},screenFixed:{width:600,height:1000},metricsSafeArea:{left:0,top:40,right:580,bottom:1000,width:580,height:960}},'90':sample(600,1000)}},
    {id:'outer',label:'Outer',source:{status:'verified'},measurements:{'0':sample(400,800),'90':sample(800,400)}},
  ]},
  {id:'phone',label:'Phone fixture',defaultDisplay:'main',displays:[{id:'main',label:'Main',source:{status:'verified'},measurements:{'0':sample(420,900),'90':sample(900,420)}}]},
]});

test('the shipped registry is complete and Duo defaults to its observed open natural orientation', () => {
  validateDeviceRegistry(DEVICE_REGISTRY);
  assert.deepEqual(DEVICE_REGISTRY.devices.map(device=>device.id),['iphone-duo','iphone-18-pro','iphone-18-pro-max','iphone-17','pixel-7','ipad-mini-a17-pro']);
  assert.deepEqual(DEVICE_REGISTRY.defaultSelection,{device:'iphone-duo',display:'inner',rotation:0});
  const natural=deviceGeometry(DEVICE_REGISTRY.defaultSelection);
  assert.deepEqual(natural.screen,{width:951,height:669});
  assert.deepEqual(natural.viewport,{width:951,height:669});
  assert.equal(natural.metrics.deviceOrientation,'landscape');
  assert.equal(natural.pixelRatio,3);
  const inverted=deviceGeometry({...DEVICE_REGISTRY.defaultSelection,rotation:90});
  assert.equal(inverted.content.y,82);
  assert.equal(inverted.metrics.safeArea.top,34); // fixed space is not current screen space
  const pixel=DEVICE_REGISTRY.devices.find(device=>device.id==='pixel-7');
  assert.equal(pixel.displays[0].source.type,'playwright-browser-preview');
  assert.equal(pixel.displays[0].source.descriptorVersion,'1.56.1');
});

test('documented device sizes and densities match every shipped display and rotation',async () => {
  const documentation=await readFile(new URL('../docs/devices.md',import.meta.url),'utf8');
  const labels={
    'iphone-duo/inner':'iPhone Duo 内屏',
    'iphone-duo/outer':'iPhone Duo 外屏',
    'iphone-18-pro/main':'iPhone 18 Pro',
    'iphone-18-pro-max/main':'iPhone 18 Pro Max',
    'iphone-17/main':'iPhone 17',
    'pixel-7/main':'Pixel 7 网页预览',
    'ipad-mini-a17-pro/main':'iPad mini (A17 Pro)',
  };
  let displays=0;
  for(const device of DEVICE_REGISTRY.devices)for(const display of device.displays){
    const label=labels[device.id+'/'+display.id];assert.ok(label,'New display needs a documented coordinate row');
    const columns=[0,90].map(rotation=>{const value=deviceGeometry({device:device.id,display:display.id,rotation});return `${value.screen.width} × ${value.screen.height} / ${value.viewport.width} × ${value.viewport.height}`;});
    const expected=`| ${label} | ${columns.join(' | ')} | ${display.measurements['0'].pixelRatio} |`;
    assert.ok(documentation.split('\n').includes(expected),'Device documentation drift: '+expected);
    displays++;
  }
  assert.equal(displays,Object.keys(labels).length);
});

test('both Pixel browser previews match the installed portrait and landscape descriptors without axis inference',async () => {
  const version=JSON.parse(await readFile(new URL(import.meta.resolve('playwright/package.json')),'utf8')).version;
  const display=DEVICE_REGISTRY.devices.find(device=>device.id==='pixel-7').displays[0];
  assert.equal(version,'1.56.1');assert.equal(display.source.descriptorVersion,version);
  assert.deepEqual(display.source.descriptors,['Pixel 7','Pixel 7 landscape']);
  for(const [rotation,name] of [[0,'Pixel 7'],[90,'Pixel 7 landscape']]){
    const descriptor=browserDevices[name],measurement=display.measurements[String(rotation)];
    assert.deepEqual({width:measurement.width,height:measurement.height},descriptor.viewport);
    assert.equal(measurement.pixelRatio,descriptor.deviceScaleFactor);
    assert.equal(measurement.statusBarHeight,0);
    assert.deepEqual(measurement.safeArea,{top:0,right:0,bottom:0,left:0});
    assert.equal(measurement.provenance.descriptor,name);assert.equal(measurement.provenance.descriptorVersion,version);
    assert.deepEqual(measurement.provenance.descriptorViewport,descriptor.viewport);
    assert.deepEqual(measurement.provenance.descriptorScreen,descriptor.screen);
  }
});

test('registered URL options round-trip and arbitrary runtime overrides fail closed', () => {
  const registry = validateDeviceRegistry(fixture());
  assert.deepEqual(parseDeviceSelection('',registry),{scene:'shop',selection:registry.defaultSelection});
  const value = {device:'fold',display:'outer',rotation:90};
  assert.deepEqual(parseDeviceSelection(selectionSearch('basic',value,registry),registry),{scene:'basic',selection:value});
  assert.deepEqual(parseDeviceSelection('?device=phone',registry).selection,{device:'phone',display:'main',rotation:0});
  for (const search of ['?runtime=x','?policy=x','?pack=x','?api=network','?scene=shop&scene=order','?device=fold&device=phone','?rotation=180','?rotation=90.0','?rotation=','?device=unknown','?device=phone&display=inner','?scene=unknown']) assert.throws(() => parseDeviceSelection(search,registry),{code:'ERR_SHOWCASE_DEVICE'});
  assert.throws(() => parseDeviceRequest({type:'showcase.device.request',schemaVersion:1,requestId:'a',selection:value,apis:[]},registry));
  assert.throws(() => parseDeviceRequest({type:'showcase.device.request',schemaVersion:2,requestId:'a',selection:value},registry));
});

test('geometry covers the full surface and preserves separate local safe layout, fixed safe-area coordinates and simulated density', () => {
  const registry = fixture(), geometry = deviceGeometry(registry.defaultSelection,registry);
  assert.deepEqual(geometry.screen,{width:1000,height:600});
  assert.deepEqual(geometry.content,{x:0,y:0,width:960,height:580});
  assert.deepEqual(geometry.viewport,{width:1000,height:600});
  assert.equal(geometry.metrics.windowWidth,1000);
  assert.equal(geometry.metrics.screenWidth,1000);
  assert.equal(geometry.metrics.pixelRatio,3);
  assert.equal(geometry.metrics.screenTop,0);
  assert.deepEqual(geometry.metrics.hostLayout,{version:1,safeInsets:{top:0,right:40,bottom:20,left:0},verticalBarEdge:'right',reservedRegions:[]});
  geometry.metrics.hostLayout.safeInsets.right=0;
  assert.equal(registry.devices[0].displays[0].measurements['0'].hostLayout.safeInsets.right,40,'Returned geometry cannot mutate registered measurements');
  assert.deepEqual(geometry.metrics.safeArea,{left:0,top:40,right:580,bottom:1000,width:580,height:960});
  assert.equal(fitDeviceScale(geometry.screen,{width:204,height:620}),.2);
  assert.equal(fitDeviceScale(geometry.screen,{width:2040,height:310}),.5);
  assert.equal(fitDeviceScale(geometry.screen,{width:2040,height:1240}),1);
  assert.throws(() => fitDeviceScale(geometry.screen,{width:0,height:500}));
});

test('registry rejects missing measurements, invalid coordinate spaces and duplicate IDs', () => {
  const missing = fixture(); missing.devices[0].displays[0].measurements['90'] = null;
  assert.throws(() => validateDeviceRegistry(missing));
  validateDeviceRegistry(missing,{requireMeasurements:false});
  const duplicate = fixture(); duplicate.devices.push(duplicate.devices[0]);
  assert.throws(() => validateDeviceRegistry(duplicate));
  const unsafe = fixture(); unsafe.devices[0].displays[0].measurements['0'].metricsSafeArea.height = 599;
  assert.throws(() => validateDeviceRegistry(unsafe));
  const pending = fixture(); pending.devices[0].displays[0].source.status = 'pending';
  assert.throws(() => deviceGeometry(pending.defaultSelection,pending));
});

const deferred = () => { let resolve,reject; const promise = new Promise((yes,no) => {resolve=yes;reject=no;}); return {promise,resolve,reject}; };
function controllerFixture() {
  const registry = fixture(), source = {}, origin = 'https://showcase.invalid', applied = [], posts = [], order = [], metrics = deferred(), presented = deferred();
  const session = {setWindowMetrics(value) { order.push('metrics-fence'); applied.push(value); return metrics.promise; }};
  const controller = createDeviceController({initialSelection:registry.defaultSelection,registry,getSession:() => session,applyGeometry:() => order.push('display-geometry'),waitForPresentation:() => {order.push('presentation');return presented.promise;},post:value=>posts.push(value),source,origin});
  const event = (requestId,selection={device:'fold',display:'outer',rotation:0}) => ({source,origin,data:{type:'showcase.device.request',schemaVersion:1,requestId,selection}});
  return {registry,controller,metrics,presented,applied,posts,order,event};
}
test('fold and rotation retain their owner, fence input first and acknowledge only after presentation',async () => {
  const {controller,event,order,metrics,presented,posts,applied} = controllerFixture();
  const transaction = controller.receive(event('request-1'));
  assert.equal(controller.busy,true); assert.deepEqual(order,['metrics-fence','display-geometry']);
  assert.equal(posts.length,0); metrics.resolve(); await Promise.resolve();
  assert.deepEqual(order,['metrics-fence','display-geometry','presentation']);
  assert.equal(posts.length,0); presented.resolve(); assert.equal(await transaction,true);
  assert.deepEqual(posts[0],{type:'showcase.device.ack',schemaVersion:1,requestId:'request-1',status:'committed',selection:{device:'fold',display:'outer',rotation:0},viewport:{width:400,height:800}});
  assert.equal(applied[0].windowWidth,400); assert.equal(controller.busy,false);
  assert.equal(await controller.receive(event('request-1')),false); assert.equal(applied.length,1);
});
test('foreign origins, sources, model changes, concurrent requests and configuration injection are rejected',async () => {
  const {controller,event,metrics,presented,posts,applied} = controllerFixture();
  assert.equal(await controller.receive({...event('foreign-origin'),origin:'https://other.invalid'}),false);
  assert.equal(await controller.receive({...event('foreign-owner'),source:{}}),false);
  assert.equal(posts.length,0);
  assert.equal(await controller.receive(event('new-model',{device:'phone',display:'main',rotation:0})),false);
  const injected = event('injected'); injected.data.apis = ['network'];
  assert.equal(await controller.receive(injected),false);
  const first = controller.receive(event('first'));
  assert.equal(await controller.receive(event('concurrent',{device:'fold',display:'inner',rotation:90})),false);
  assert.equal(applied.length,1); assert.equal(posts.at(-1).code,'ERR_SHOWCASE_DEVICE_BUSY');
  metrics.resolve(); presented.resolve(); await first;
});
test('closing cancels a metrics transaction and suppresses its late acknowledgement',async () => {
  const {controller,event,metrics,presented,posts} = controllerFixture();
  const transaction = controller.receive(event('closing'));
  controller.close(); metrics.resolve(); presented.resolve();
  assert.equal(await transaction,false); assert.equal(posts.length,0);
  assert.equal(await controller.receive(event('closed')),false);
});

function animationClock() {
  let serial = 0, time = 0; const callbacks = new Map();
  return {schedule:callback=>{callbacks.set(++serial,callback);return serial;},cancel:id=>callbacks.delete(id),now:()=>time,advance(ms=16){time+=ms;const batch=[...callbacks.values()];callbacks.clear();for(const callback of batch)callback();},get pending(){return callbacks.size;}};
}
test('device readiness requires a matching accepted picture, open metrics fence and two stable observation ticks',async () => {
  const clock = animationClock(), abort = new AbortController();
  const geometry = {viewport:{width:600,height:960}};
  const state = {inputEnabled:false,metricsFence:{phase:'pending'},presentation:{accepted:null},observation:{sequence:'1',state:{viewport:{width:375,height:720}}}};
  let resolved = false;
  const promise = waitForDevicePresentation({...clock,getStatus:()=>state,geometry,signal:abort.signal}).then(()=>{resolved=true;});
  clock.advance(); assert.equal(resolved,false);
  state.inputEnabled=true; state.presentation.accepted={inputEnabled:true,proof:{consumedInput:{viewport:{width:375,height:720}}}}; state.metricsFence.phase='open';
  clock.advance(); assert.equal(resolved,false); // accepted picture is still old
  state.observation.state.viewport={...geometry.viewport};
  clock.advance(); assert.equal(resolved,false); // current observation alone is not a picture
  state.presentation.accepted.proof.consumedInput.viewport={...geometry.viewport};
  clock.advance(); state.observation.sequence='2'; clock.advance();
  assert.equal(resolved,false); clock.advance(); await promise;
  assert.equal(resolved,true); assert.equal(clock.pending,0);
});
test('presentation wait releases its animation callback on timeout and owner shutdown',async () => {
  const clock=animationClock(),abort=new AbortController();
  const args={...clock,getStatus:()=>({}),geometry:{viewport:{width:100,height:100}},signal:abort.signal};
  const timeout=waitForDevicePresentation({...args,timeoutMs:30});
  clock.advance(31); await assert.rejects(timeout,{code:'ERR_SHOWCASE_DEVICE_TIMEOUT'}); assert.equal(clock.pending,0);
  const closed=waitForDevicePresentation(args); abort.abort();
  await assert.rejects(closed,{code:'ERR_CANCELLED'}); assert.equal(clock.pending,0);
  const failed=waitForDevicePresentation({...args,signal:new AbortController().signal,getStatus:()=>({fault:{code:'ERR_RENDER'}})});
  clock.advance();await assert.rejects(failed,{code:'ERR_RENDER'});assert.equal(clock.pending,0);
});

test('host replies cannot cross origins, requests, retired iframe owners or expired waits',async () => {
  const listeners = new Set(), timers = new Set(), owner = {}, origin = 'https://showcase.invalid';
  let current = owner;
  const args = {owner,origin,currentOwner:()=>current,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},post:()=>{},accepts:value=>value.type==='showcase.status'&&value.state==='closed',schedule:callback=>{timers.add(callback);return callback;},cancel:callback=>timers.delete(callback)};
  const payload = requestId => ({type:'showcase.close',schemaVersion:1,requestId});
  const reply = (requestId,options={}) => { for(const listener of [...listeners]) listener({source:owner,origin,data:{type:'showcase.status',schemaVersion:1,requestId,state:'closed'},...options}); };
  let closed = false;
  const first = requestShowcaseOwner({...args,payload:payload('close-1')}).then(()=>{closed=true;});
  reply('close-1',{origin:'https://other.invalid'});reply('close-1',{source:{}});reply('old-request');
  await Promise.resolve();assert.equal(closed,false);
  current={};reply('close-1');await Promise.resolve();assert.equal(closed,false);
  current=owner;reply('close-1');await first;assert.equal(closed,true);
  assert.equal(listeners.size,0);assert.equal(timers.size,0);
  const expired=requestShowcaseOwner({...args,payload:payload('expired')});
  for(const timer of [...timers])timer();
  await assert.rejects(expired,{code:'ERR_SHOWCASE_DEVICE_TIMEOUT'});
  const abort=new AbortController();
  const fresh=requestShowcaseOwner({...args,payload:payload('fresh'),signal:abort.signal});
  reply('expired');assert.equal(listeners.size,1);
  abort.abort();await assert.rejects(fresh,{code:'ERR_CANCELLED'});
  assert.equal(listeners.size,0);assert.equal(timers.size,0);
});

test('registered local layout rejects stale versions, unknown edges, invalid regions and duplicate identities',()=>{
  const valid={version:1,safeInsets:{top:0,right:40,bottom:20,left:0},verticalBarEdge:'right',reservedRegions:[{id:'camera',kind:'occlusion',x:960,y:0,width:40,height:60}]};
  validateHostLayout(valid,1000,600);
  for(const mutate of [value=>value.version=2,value=>value.verticalBarEdge='trailing',value=>value.safeInsets.left=1000,value=>value.reservedRegions[0].width=41,value=>value.reservedRegions.push({...value.reservedRegions[0]}),value=>value.reservedRegions[0].active=false]){const invalid=structuredClone(valid);mutate(invalid);assert.throws(()=>validateHostLayout(invalid,1000,600),{code:'ERR_SHOWCASE_DEVICE'});}
  assert.deepEqual(unobstructedRect({x:0,y:0,width:1000,height:600},[{id:'fold',kind:'division',x:480,y:0,width:40,height:600}]),{x:0,y:0,width:480,height:600});
  assert.deepEqual(unobstructedRect({x:0,y:0,width:1000,height:600},[]),{x:0,y:0,width:1000,height:600});
});
test('same-size layout readiness requires the exact committed metrics revision and local regions',async()=>{
  const clock=animationClock(),abort=new AbortController(),geometry=deviceGeometry(fixture().defaultSelection,fixture());
  const state={windowMetrics:structuredClone(geometry.metrics),inputEnabled:true,metricsFence:{phase:'open',revision:'4'},presentation:{accepted:{inputEnabled:true,proof:{consumedInput:{viewport:{...geometry.viewport}}}}},observation:{sequence:'8',state:{viewport:{...geometry.viewport}}}};
  state.windowMetrics.hostLayout.reservedRegions=[{id:'old-fold',kind:'division',x:400,y:0,width:20,height:600}];
  let ready=false;const waiting=waitForDevicePresentation({...clock,getStatus:()=>state,geometry,signal:abort.signal,revision:'5'}).then(()=>{ready=true;});
  clock.advance();clock.advance();assert.equal(ready,false);
  state.metricsFence.revision='5';clock.advance();clock.advance();assert.equal(ready,false,'Same viewport and current transaction cannot reuse old local regions');
  state.windowMetrics=structuredClone(geometry.metrics);clock.advance();clock.advance();await waiting;assert.equal(ready,true);
});
