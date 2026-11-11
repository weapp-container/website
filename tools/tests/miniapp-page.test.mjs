import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import vm from 'node:vm'
const require=createRequire(import.meta.url)
const {createShowcase}=require('../../miniapp/lib/bridge.js')
const {pageLayout}=require('../../miniapp/lib/layout.js')
const pageRequire=createRequire(new URL('../../miniapp/pages/home/index.js',import.meta.url))
async function fixture(scene,viewport={}){
  const messages=[],updates=[],runtime=createShowcase({sessionId:'ui-session',transport:{postMessage:message=>messages.push(message),onMessage(){},offMessage(){}}})
  const layoutListeners=new Set();let page,timerId=0,windowInfo={windowWidth:375,windowHeight:720,...viewport};const timers=new Map()
  vm.runInNewContext(await readFile(new URL('../../miniapp/pages/home/index.js',import.meta.url),'utf8'),{Page:definition=>{page=definition},getApp:()=>({showcase:runtime}),require:pageRequire,wx:{getWindowInfo:()=>windowInfo,onHostLayoutChange:listener=>layoutListeners.add(listener),offHostLayoutChange:listener=>layoutListeners.delete(listener)},setTimeout:callback=>{timers.set(++timerId,callback);return timerId},clearTimeout:id=>timers.delete(id)},{filename:'showcase-page.js'})
  page.setData=(update,complete)=>{updates.push(update);Object.assign(page.data,update);complete?.()};page.onLoad({scene})
  const event=dataset=>({currentTarget:{dataset}})
  function commit(value){const request=messages.filter(message=>message.type==='showcase.text.request').at(-1);return runtime.receive({...request,type:'showcase.text.commit',value})}
  const tick=()=>{const next=timers.entries().next().value;if(next){timers.delete(next[0]);next[1]()}}
  const resize=size=>{windowInfo={...windowInfo,...size};page.onResize()}
  const hostLayout=layout=>{windowInfo={...windowInfo,hostLayout:layout};for(const listener of layoutListeners)listener({hostLayout:layout})}
  return {page,runtime,messages,updates,event,commit,timers,tick,resize,hostLayout,layoutListeners}
}
for(const scene of ['shop','order'])for(const [width,height] of [[375,720],[320,240],[599,280],[600,240],[960,540],[768,1024],[240,136],[240,100],[375.5,239.5],[375,0]]){
  test(`${scene} derives layout from the actual ${width} × ${height} viewport`,async()=>{
    const {page}=await fixture(scene,{windowWidth:width,windowHeight:height,safeArea:{top:24,bottom:height-24,height:height-48}})
    try{
      assert.equal(page.data.width,width);assert.equal(page.data.height,height)
      assert.equal(page.data.topbarHeight,Math.min(64,height));assert.equal(page.data.navHeight,Math.min(72,Math.max(0,height-64)))
      assert.equal(page.data.contentHeight,Math.max(0,height-136))
      if(height>=136)assert.equal(page.data.topbarHeight+page.data.contentHeight+page.data.navHeight,height)
      assert.equal(page.data.wideLayout,width>=600)
      const rowWidth=page.data.catalogCardWidth*(width>=600?2:1)+(width>=600?16:0)
      assert.equal(rowWidth,width-40)
      assert.ok(page.data.catalogCardWidth>=0)
      page.askReset();assert.equal(page.data.resetConfirm,true)
      assert.ok(page.data.modalHeight<=height)
      assert.ok(page.data.modalWidth<=width)
      assert.equal(page.data.modalBodyHeight+page.data.modalActionsHeight,page.data.modalHeight)
      assert.ok(page.data.modalButtonHeight<=page.data.modalActionsHeight)
      if(height>=136)assert.equal(page.data.modalButtonHeight,44)
    }finally{page.onUnload()}
  })
}
test('resize event dimensions win over the previous window observation',async()=>{
  const {page}=await fixture('shop')
  try{
    page.onResize({size:{windowWidth:800,windowHeight:260}})
    assert.equal(page.data.width,800);assert.equal(page.data.height,260)
    assert.equal(page.data.contentHeight,124);assert.equal(page.data.wideLayout,true)
    page.onResize({size:{windowWidth:375,windowHeight:720}})
    assert.equal(page.data.contentHeight,584);assert.equal(page.data.wideLayout,false)
  }finally{page.onUnload()}
})
test('rotating preserves the product selection, pending input, carts and checkout confirmation',async()=>{
  const {page,runtime,messages,event,commit,resize}=await fixture('shop')
  try{
    page.search();commit('陶瓷');page.category(event({value:'生活'}))
    page.foodCategory(event({value:'热食'}));page.orderFilter(event({value:'shop'}))
    runtime.model.add('food','pizza',1,2);runtime.model.note('不要香菜');runtime.model.pickup('店内用餐')
    page.detail(event({id:'mug',kind:'shop'}));page.spec(event({index:1}));page.detailQuantity(event({delta:2}));page.addDetail()
    page.search();page.askReset()
    const layoutKeys=new Set([...Object.keys(pageLayout(375,720)),'statusLabel','metrics'])
    const businessData=()=>JSON.stringify(Object.fromEntries(Object.entries(page.data).filter(([key])=>!layoutKeys.has(key))), (key,value)=>key==='layoutWidth'?undefined:value)
    const before=businessData(),stateBefore=JSON.stringify(runtime.model.snapshot()),messagesBefore=messages.length
    for(const [width,height] of [[960,280],[600,240],[599,320],[375,720]]){
      resize({windowWidth:width,windowHeight:height})
      assert.equal(businessData(),before)
      assert.equal(JSON.stringify(runtime.model.snapshot()),stateBefore)
    }
    assert.equal(messages.length,messagesBefore)
    assert.equal(commit('杯'),true);assert.equal(page.data.textPending,false)
    assert.equal(page.data.selectedSpec,1);assert.equal(page.data.detailQuantity,3)
    assert.equal(page.data.cartCount,3);assert.equal(page.data.foodCount,2)
    page.cancelReset();page.openCart(event({kind:'shop'}));page.checkout();page.askPay()
    const checkout=businessData()
    resize({windowWidth:844,windowHeight:240})
    assert.equal(businessData(),checkout);assert.equal(page.data.screen,'checkout');assert.equal(page.data.confirmPay,true)
    page.pay()
    assert.equal(page.data.order.totalText,'267.00');assert.equal(page.data.order.details[0].spec,1);assert.equal(page.data.order.details[0].quantity,3)
    assert.equal(page.data.foodCount,2);assert.equal(page.data.note,'不要香菜');assert.equal(page.data.pickup,'店内用餐')
  }finally{page.onUnload()}
})
test('actual page handlers complete a Chinese search and shopping checkout',async()=>{
  const {page,runtime,event,commit}=await fixture('shop')
  assert.equal(page.data.screen,'shop');assert.equal(page.data.contentHeight,584)
  page.search();assert.equal(commit('陶瓷'),true);assert.equal(page.data.products.length,1);assert.equal(page.data.products[0].id,'mug')
  page.detail(event({id:'mug',kind:'shop'}));page.spec(event({index:1}));page.detailQuantity(event({delta:1}));page.buyDetail()
  assert.equal(page.data.screen,'cart');assert.equal(page.data.checkoutTotal,'178.00')
  page.checkout();page.address(event({field:'detail'}));commit('上海市 · 演示公园 8 号')
  page.askPay();assert.equal(page.data.confirmPay,true);page.pay()
  assert.equal(page.data.screen,'order');assert.equal(page.data.order.totalText,'178.00');assert.equal(page.data.order.address.detail,'上海市 · 演示公园 8 号')
  assert.equal(runtime.model.totals('shop').quantity,0)
  page.transition(event({action:'complete'}));assert.equal(page.data.order.status,'completed')
  page.onUnload()
})
test('host scene changes reuse the page and retain commerce state while dismissing stale text input',async()=>{
  const {page,runtime,messages,updates}=await fixture('shop')
  runtime.model.add('shop','mug');runtime.model.add('food','coffee',1,2)
  const before=JSON.stringify(runtime.model.snapshot())
  page.search();const textRequest=messages.at(-1)
  assert.equal(textRequest.type,'showcase.text.request')
  const request={protocolVersion:1,sessionId:runtime.sessionId,type:'showcase.scene.request',requestId:'scene-order',scene:'order'}
  const updatesBeforeScene=updates.length
  assert.equal(runtime.receive(request),true)
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(updates.length,updatesBeforeScene+1,'Scene navigation must commit one atomic page update')
  assert.equal(page.data.screen,'food');assert.equal(page.data.active,'food');assert.equal(page.data.title,'日日食堂')
  assert.equal(page.data.query,'');assert.equal(page.data.confirmPay,false);assert.equal(page.data.textPending,false)
  assert.equal(JSON.stringify(runtime.model.snapshot()),before)
  assert.ok(messages.some(message=>message.type==='showcase.text.dismiss'&&message.requestId===textRequest.requestId))
  assert.deepEqual(messages.at(-1),{...request,type:'showcase.scene.ack',status:'committed'})
  const updatesBeforeBasic=updates.length
  assert.equal(runtime.receive({...request,requestId:'scene-basic',scene:'basic'}),true)
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(updates.length,updatesBeforeBasic+1,'Repeated scene navigation must remain one atomic page update')
  assert.equal(page.data.screen,'home');assert.equal(page.data.active,'home');assert.equal(JSON.stringify(runtime.model.snapshot()),before)
  page.onUnload()
  assert.equal(runtime.receive({...request,requestId:'scene-after-unload',scene:'shop'}),true)
  await new Promise(resolve=>setImmediate(resolve))
  assert.deepEqual(messages.at(-1),{...request,requestId:'scene-after-unload',scene:'shop',type:'showcase.scene.ack',status:'error',code:'ERR_SHOWCASE_SCENE'})
})
test('feedback only updates a bounded header label and leaves content geometry and scroll inputs alone',async()=>{
  const markup=await readFile(new URL('../../miniapp/pages/home/index.wxml',import.meta.url),'utf8')
  const styles=await readFile(new URL('../../miniapp/app.wxss',import.meta.url),'utf8')
  const header=markup.slice(0,markup.indexOf('<scroll-view class="body"'))
  assert.ok(header.includes('{{statusLabel}}'),'Feedback must be inside the fixed header before the scroll viewport')
  assert.equal(markup.match(/\{\{statusLabel\}\}/g)?.length,1)
  assert.doesNotMatch(markup,/class="feedback"/,'A separate feedback overlay could intercept content actions')
  assert.doesNotMatch(styles,/\.feedback\s*\{/)
  assert.match(styles,/\.top-status\{[^}]*height:40px[^}]*overflow:hidden/)
  const {page,runtime,updates,tick,resize}=await fixture('order',{windowWidth:240,windowHeight:240})
  try{
    const geometry=()=>JSON.stringify({width:page.data.width,height:page.data.height,topbarHeight:page.data.topbarHeight,contentHeight:page.data.contentHeight,navHeight:page.data.navHeight})
    const before=geometry(),business=JSON.stringify(runtime.model.snapshot())
    const message='这是一条很长的状态提示，仍然只能在顶部栏显示，不能改变正文滚动区域或遮住操作按钮'
    updates.length=0;page.feedback(message)
    assert.equal(page.data.feedback,message);assert.ok(page.data.statusLabel.endsWith('…'))
    assert.ok(Array.from(page.data.statusLabel).length<=18)
    assert.deepEqual(Object.keys(updates.at(-1)).sort(),['feedback','statusLabel'])
    assert.equal(geometry(),before);assert.equal(JSON.stringify(runtime.model.snapshot()),business)
    resize({windowWidth:867,windowHeight:635})
    assert.equal(page.data.feedback,message);assert.equal(page.data.statusLabel,message)
    const resized=geometry();updates.length=0;tick()
    assert.equal(page.data.feedback,'');assert.equal(page.data.statusLabel,'LIVE DEMO')
    assert.deepEqual(Object.keys(updates.at(-1)).sort(),['feedback','statusLabel'])
    assert.equal(geometry(),resized);assert.equal(JSON.stringify(runtime.model.snapshot()),business)
  }finally{page.onUnload()}
})
test('a simulated pickup can complete while the preceding payment feedback is still live',async()=>{
  const {page,event,timers}=await fixture('order',{windowWidth:867,windowHeight:635})
  try{
    page.detail(event({id:'coffee',kind:'food'}));page.buyDetail();page.checkout();page.pay()
    assert.equal(page.data.feedback,'模拟下单成功，没有发生真实扣款')
    assert.equal(page.data.order.status,'preparing');assert.equal(timers.size,1)
    const contentHeight=page.data.contentHeight
    page.transition(event({action:'complete'}))
    assert.equal(page.data.order.status,'completed');assert.equal(page.data.statusLabel,'演示订单状态已更新')
    assert.equal(page.data.contentHeight,contentHeight);assert.equal(timers.size,1)
  }finally{page.onUnload()}
})
test('basic input and animation retire their owners on navigation and unload',async()=>{
  const {page,runtime,messages,event,commit,timers,tick}=await fixture('basic')
  page.basicText();assert.equal(commit('你好，容器'),true);assert.equal(page.data.basicValue,'你好，容器')
  page.animate();for(let step=0;step<16;step++)tick()
  assert.equal(page.data.motionOffset,210);assert.equal(page.data.motionRunning,false);assert.equal(timers.size,0)
  page.animate();tick();assert.ok(page.data.motionOffset>0);page.navigate(event({screen:'shop'}))
  assert.equal(page.data.motionRunning,false);assert.equal(timers.size,0)
  page.navigate(event({screen:'home'}));page.basicText();const stale=messages.at(-1);page.animate();page.onUnload()
  assert.equal(timers.size,0);assert.equal(runtime.receive({...stale,type:'showcase.text.commit',value:'过期结果'}),false)
  assert.equal(page.data.basicValue,'你好，容器')
})
test('actual food handlers retain selected extras and cancel stale text after navigation',async()=>{
  const {page,runtime,messages,event,commit}=await fixture('order')
  assert.equal(page.data.screen,'food')
  page.detail(event({id:'pizza',kind:'food'}));page.spec(event({index:1}));page.buyDetail();page.note();commit('不要香菜')
  assert.equal(page.data.note,'不要香菜');page.pickup(event({value:'店内用餐'}));page.checkout();page.pay()
  assert.equal(page.data.order.totalText,'63.00');assert.equal(page.data.order.note,'不要香菜');assert.equal(page.data.order.status,'preparing')
  page.navigate(event({screen:'shop'}));page.search();const old=messages.at(-1);page.navigate(event({screen:'orders'}))
  assert.equal(runtime.receive({...old,type:'showcase.text.commit',value:'失效搜索'}),false);assert.equal(page.data.query,'')
  page.reset();assert.equal(page.data.screen,'home');assert.equal(page.data.orders.length,0)
  page.onUnload()
})

const localLayout=(edge='right',regions=[])=>({version:1,safeInsets:{top:0,right:84,bottom:34,left:0},verticalBarEdge:edge,reservedRegions:regions});
const overlaps=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
test('full surface paints under safe insets while content and rail controls avoid the camera',async()=>{
  const camera={id:'camera',kind:'occlusion',x:867,y:0,width:84,height:100};
  const {page,hostLayout,layoutListeners}=await fixture('shop',{windowWidth:951,windowHeight:669,hostLayout:localLayout('right',[camera])});
  try{
    const d=page.data;assert.equal(d.width,951);assert.equal(d.height,669);assert.equal(d.sideNavigation,true);assert.equal(d.bodyWidth,867);assert.equal(d.navX,867);
    assert.ok(d.railY>=100);assert.ok(d.navY>=d.railY+d.railButtonHeight*2);
    assert.equal(overlaps({x:d.bodyX,y:d.bodyY,width:d.bodyWidth,height:d.contentHeight},camera),false);
    assert.equal(overlaps({x:d.modalX,y:d.modalY,width:d.modalWidth,height:d.modalHeight},camera),false);
    hostLayout({...localLayout('left'),safeInsets:{top:0,left:84,right:0,bottom:34},reservedRegions:[{...camera,x:0}]});
    assert.equal(page.data.navX,0);assert.equal(page.data.bodyX,84);assert.equal(page.data.width,951);
    hostLayout(undefined);assert.equal(page.data.sideNavigation,false);assert.equal(page.data.bodyWidth,951,'Missing layout must clear the previous local safe geometry');
  }finally{page.onUnload();assert.equal(layoutListeners.size,0)}
});
test('active fold separates catalog columns and puts forms and modals in an unobstructed pane',async()=>{
  const fold={id:'active-fold',kind:'division',x:460,y:0,width:28,height:669},layout={version:1,safeInsets:{top:0,right:0,bottom:0,left:0},verticalBarEdge:'none',reservedRegions:[fold]};
  const {page,event,hostLayout}=await fixture('shop',{windowWidth:951,windowHeight:669,hostLayout:layout});
  try{
    assert.equal(page.data.foldColumns,true);assert.equal(page.data.wideLayout,true);
    const d=page.data,left={x:d.bodyX+20,y:d.bodyY,width:d.catalogCardWidths[0],height:100},right={x:d.bodyX+20+d.catalogWidth-d.catalogCardWidths[1],y:d.bodyY,width:d.catalogCardWidths[1],height:100};
    assert.equal(overlaps(left,fold),false);assert.equal(overlaps(right,fold),false);
    assert.equal(overlaps({x:d.modalX,y:d.modalY,width:d.modalWidth,height:d.modalHeight},fold),false);
    page.detail(event({id:'mug',kind:'shop'}));page.buyDetail();page.checkout();page.askPay();const before=JSON.stringify(page.model.snapshot());
    hostLayout({...layout,reservedRegions:[]});assert.equal(page.data.foldColumns,false);assert.equal(page.data.contentPaneWidth,911);assert.equal(page.data.screen,'checkout');assert.equal(page.data.confirmPay,true);assert.equal(JSON.stringify(page.model.snapshot()),before);
  }finally{page.onUnload()}
});
test('same-size local layout events preserve pending Chinese input and business ownership',async()=>{
  const {page,hostLayout,event,commit,runtime}=await fixture('shop',{windowWidth:951,windowHeight:669,hostLayout:localLayout()});
  try{page.detail(event({id:'mug',kind:'shop'}));page.addDetail();page.search();const state=JSON.stringify(runtime.model.snapshot());
    for(const edge of ['left','none','right'])hostLayout({...localLayout(edge),safeInsets:edge==='left'?{top:0,right:0,bottom:34,left:84}:{top:0,right:84,bottom:34,left:0}});
    assert.equal(page.data.screen,'product');assert.equal(page.data.textPending,true);assert.equal(JSON.stringify(runtime.model.snapshot()),state);assert.equal(commit('杯'),true);assert.equal(page.data.query,'杯');
  }finally{page.onUnload()}
});
test('guest close emits the latest state before the versioned owner close request',async()=>{
  const {page,runtime,messages,event}=await fixture('shop');
  try{page.detail(event({id:'mug',kind:'shop'}));page.addDetail();page.search();page.close();
    assert.equal(messages.at(-1).type,'showcase.close.request');assert.equal(messages.at(-1).protocolVersion,1);assert.equal(messages.at(-1).sessionId,runtime.sessionId);assert.equal(messages.at(-2).type,'showcase.state.changed');assert.equal(messages.at(-2).state.cart[0].quantity,1);assert.ok(messages.some(value=>value.type==='showcase.text.dismiss'));
  }finally{page.onUnload()}
});

test('a second obstruction prevents a fold grid from spanning an unsafe pane',()=>{
  const fold={id:'fold',kind:'division',x:455.5,y:0,width:40,height:669},camera={id:'embedded-occlusion',kind:'occlusion',x:600,y:100,width:80,height:80};
  const d=pageLayout(951,669,{version:1,safeInsets:{top:0,right:84,bottom:34,left:0},verticalBarEdge:'right',reservedRegions:[fold,camera]});
  assert.equal(d.foldColumns,false);
  assert.equal(overlaps({x:d.bodyX,y:d.bodyY,width:d.bodyWidth,height:d.contentHeight},camera),false);
  assert.equal(overlaps({x:d.bodyX,y:d.bodyY,width:d.bodyWidth,height:d.contentHeight},fold),false);
});
