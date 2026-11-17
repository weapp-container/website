const catalog=require('../../lib/catalog')
const {pageLayout}=require('../../lib/layout')
const statusText={paid:'待发货',preparing:'制作中',completed:'已完成',cancelled:'已取消'}
const screenTitles={home:'Weapp Container',shop:'MORROW 商店',food:'日日食堂',orders:'我的订单',product:'发现好物',cart:'购物袋',checkout:'确认订单',order:'订单详情'}
const topbarHeight=64,navHeight=72
// Two bounded lines in the fixed header; raw feedback remains available until
// its timer expires, including when a resize changes the visible label limit.
function statusLabel(message,width){
  const characters=Array.from(message||'LIVE DEMO')
  const textWidth=Math.max(0,Math.min(320,Math.max(0,width-40)*.48)-10)
  const limit=Math.max(8,Math.floor(textWidth/9)*2)
  return characters.length>limit?characters.slice(0,limit-1).join('')+'…':characters.join('')
}
Page({
  data:{screen:'home',active:'home',width:375,height:720,topbarHeight,navHeight,contentHeight:584,wideLayout:false,catalogCardWidth:335,modalWidth:343,modalHeight:300,modalBodyHeight:228,modalActionsHeight:72,modalButtonHeight:44,title:'Weapp Container',feedback:'',statusLabel:'LIVE DEMO',query:'',category:'全部',foodCategory:'全部',orderFilter:'all',counter:0,basicValue:'',motionOffset:0,motionRunning:false,resetConfirm:false,confirmPay:false,textPending:false,selectedSpec:0,detailQuantity:1,cartKind:'shop',metrics:'',products:[],meals:[],cartLines:[],orders:[],address:{},note:'',pickup:'到店自取',cartTotal:'0.00',foodTotal:'0.00',cartCount:0,foodCount:0},
  onLoad(query){
    this.runtime=getApp().showcase;this.model=this.runtime.model;this.alive=true
    this.updateMetrics()
    this.layoutListener=()=>this.updateMetrics()
    if(typeof wx.onHostLayoutChange==='function')wx.onHostLayoutChange(this.layoutListener)
    const screen=query&&query.scene==='shop'?'shop':query&&query.scene==='order'?'food':'home'
    this.setData({screen,active:screen,title:screenTitles[screen]})
    this.sceneUnsubscribe=this.runtime.onSceneRequest(scene=>new Promise(resolve=>{
      const target=scene==='order'?'food':scene==='basic'?'home':'shop'
      this.go(target,{active:target,query:'',category:'全部',foodCategory:'全部',orderFilter:'all',counter:0,basicValue:'',motionOffset:0,motionRunning:false,resetConfirm:false,confirmPay:false,textPending:false,detail:null,orderId:null},()=>resolve(true))
    }))
    this.unsubscribe=this.runtime.subscribe(()=>this.refresh());this.runtime.ready()
  },
  onResize(event){this.updateMetrics(event&&event.size)},
  onUnload(){this.alive=false;if(this.layoutListener&&typeof wx.offHostLayoutChange==='function')wx.offHostLayoutChange(this.layoutListener);if(this.sceneUnsubscribe)this.sceneUnsubscribe();if(this.unsubscribe)this.unsubscribe();this.runtime.page();if(this.feedbackTimer)clearTimeout(this.feedbackTimer);this.stopMotion()},
  updateMetrics(size){
    let info={windowWidth:375,windowHeight:720}
    try{info={...info,...wx.getWindowInfo()}}catch(_){}
    if(size)info={...info,...size}
    const width=Number.isFinite(info.windowWidth)&&info.windowWidth>=0?info.windowWidth:375
    const height=Number.isFinite(info.windowHeight)&&info.windowHeight>=0?info.windowHeight:720
    const layout=pageLayout(width,height,info.hostLayout)
    this.setData({...layout,statusLabel:statusLabel(this.data.feedback,layout.barWidth),metrics:Math.round(width)+' × '+Math.round(height)+' · Skia'})
    if(this.model)this.refresh()
  },
  refresh(patch,complete){
    if(!this.alive)return
    const data={...this.data,...(patch||{})}
    const state=this.model.snapshot(),shop=this.model.totals('shop'),food=this.model.totals('food')
    const term=(data.query||'').trim().toLowerCase(),category=data.category,foodCategory=data.foodCategory
    const products=catalog.products.filter(item=>(category==='全部'||item.category===category)&&(!term||(item.name+item.subtitle+item.category).toLowerCase().includes(term))).map((item,index)=>({...item,priceText:catalog.money(item.price),layoutWidth:data.catalogCardWidths[index%2]}))
    const meals=catalog.meals.filter(item=>foodCategory==='全部'||item.category===foodCategory).map((item,index)=>({...item,priceText:catalog.money(item.price),layoutWidth:data.catalogCardWidths[index%2],quantity:state.foodCart.filter(line=>line.id===item.id).reduce((sum,line)=>sum+line.quantity,0)}))
    const orders=state.orders.filter(order=>data.orderFilter==='all'||order.kind===data.orderFilter).map(order=>({id:order.id,kind:order.kind,kindText:order.kind==='food'?'日日食堂':'MORROW 商店',status:order.status,statusText:statusText[order.status],name:catalog.find(order.kind,order.lines[0].id).name,quantity:order.lines.reduce((sum,line)=>sum+line.quantity,0),totalText:catalog.money(order.total),image:catalog.find(order.kind,order.lines[0].id).image}))
    const kind=data.cartKind,totals=kind==='food'?food:shop
    const update={...(patch||{}),products,meals,orders,address:state.address,note:state.foodNote,pickup:state.pickup,cartCount:shop.quantity,foodCount:food.quantity,cartTotal:catalog.money(shop.total),foodTotal:catalog.money(food.total),cartLines:this.model.details(kind),checkoutTotal:catalog.money(totals.total),checkoutCount:totals.quantity,orderCount:state.orders.length}
    if(data.orderId){const order=this.model.order(data.orderId);update.order=order?{...order,statusText:statusText[order.status],kindText:order.kind==='food'?'日日食堂':'MORROW 商店',active:['paid','preparing'].includes(order.status)}:null}
    this.setData(update,complete)
  },
  go(screen,extra,complete){
    this.stopMotion();
    if(this.data.textPending)this.skipTextDismissUpdate=true
    this.runtime.page();
    this.refresh({screen,title:screenTitles[screen],feedback:'',statusLabel:'LIVE DEMO',textPending:false,resetConfirm:false,confirmPay:false,...(extra||{})},complete)
  },
  navigate(event){const screen=event.currentTarget.dataset.screen;this.go(screen,{active:screen})},
  close(){this.stopMotion();this.runtime.requestClose()},
  back(){const screen=this.data.screen;if(screen==='product')this.go(this.data.detailKind==='food'?'food':'shop');else if(screen==='checkout')this.go('cart');else if(screen==='order')this.go('orders',{active:'orders'});else if(screen==='cart')this.go(this.data.cartKind==='food'?'food':'shop');else this.go('home',{active:'home'})},
  feedback(message){this.setData({feedback:message,statusLabel:statusLabel(message,this.data.barWidth)});if(this.feedbackTimer)clearTimeout(this.feedbackTimer);this.feedbackTimer=setTimeout(()=>{if(this.alive)this.setData({feedback:'',statusLabel:'LIVE DEMO'})},3000)},
  count(){this.setData({counter:this.data.counter+1});this.feedback('setData 已更新，点击 '+this.data.counter+' 次')},
  basicText(){this.editText('basic','试试中文输入',this.data.basicValue,80,false,value=>this.setData({basicValue:value}))},
  stopMotion(){if(this.motionTimer)clearTimeout(this.motionTimer);this.motionTimer=null;if(this.alive&&this.data.motionRunning)this.setData({motionRunning:false})},
  animate(){
    if(this.data.motionRunning)return
    this.setData({motionOffset:0,motionRunning:true});let step=0
    const tick=()=>{if(!this.alive||this.data.screen!=='home'){this.stopMotion();return}step++;this.setData({motionOffset:Math.round(210*(1-Math.cos(Math.PI*step/16))/2)});if(step<16)this.motionTimer=setTimeout(tick,40);else{this.motionTimer=null;this.setData({motionRunning:false})}}
    this.motionTimer=setTimeout(tick,40)
  },
  openShop(){this.go('shop',{active:'shop'})},
  openFood(){this.go('food',{active:'food'})},
  category(event){this.setData({category:event.currentTarget.dataset.value});this.refresh()},
  foodCategory(event){this.setData({foodCategory:event.currentTarget.dataset.value});this.refresh()},
  orderFilter(event){this.setData({orderFilter:event.currentTarget.dataset.value});this.refresh()},
  search(){this.editText('search','搜索商品',this.data.query,40,false,value=>{this.setData({query:value});this.refresh()})},
  clearSearch(){this.setData({query:''});this.refresh()},
  editText(field,title,value,maxLength,multiline,commit){
    this.setData({textPending:true})
    const opened=this.runtime.text({field,title,value,maxLength,multiline,commit:value=>{if(this.alive)commit(value)},done:()=>{if(this.skipTextDismissUpdate){this.skipTextDismissUpdate=false;return}if(this.alive)this.setData({textPending:false})}})
    if(!opened){this.setData({textPending:false});this.feedback('此处通过宿主原生输入框编辑，请在展示容器内体验')}
  },
  detail(event){
    const kind=event.currentTarget.dataset.kind||'shop',item=catalog.find(kind,event.currentTarget.dataset.id)
    if(!item)return
    this.go('product',{detailKind:kind,detail:{...item,priceText:catalog.money(item.price),specOptions:item.specs.map((label,index)=>({label,index}))},selectedSpec:0,detailQuantity:1})
  },
  spec(event){
    const selectedSpec=Number(event.currentTarget.dataset.index),item=catalog.find(this.data.detailKind,this.data.detail.id)
    this.setData({selectedSpec,detail:{...this.data.detail,priceText:catalog.money(item.price+((item.extraPrices||[])[selectedSpec]||0))}})
  },
  detailQuantity(event){this.setData({detailQuantity:Math.max(1,Math.min(20,this.data.detailQuantity+Number(event.currentTarget.dataset.delta)))})},
  addDetail(){
    try{this.model.add(this.data.detailKind,this.data.detail.id,this.data.selectedSpec,this.data.detailQuantity);this.feedback(this.data.detailKind==='food'?'已加入餐袋':'已加入购物袋')}catch(error){this.feedback(error.message)}
  },
  buyDetail(){this.addDetail();this.go('cart',{cartKind:this.data.detailKind})},
  openCart(event){this.go('cart',{cartKind:event.currentTarget.dataset.kind||'shop'})},
  changeQuantity(event){try{this.model.quantity(this.data.cartKind,event.currentTarget.dataset.key,Number(event.currentTarget.dataset.delta))}catch(error){this.feedback(error.message)}},
  checkout(){if(!this.data.checkoutCount){this.feedback('先选几件喜欢的吧');return}this.go('checkout')},
  address(event){const field=event.currentTarget.dataset.field,titles={name:'收货人',phone:'联系电话',detail:'收货地址'};this.editText('address.'+field,titles[field],this.data.address[field],field==='detail'?160:24,field==='detail',value=>this.model.address(field,value))},
  note(){this.editText('food.note','点单备注',this.data.note,120,true,value=>this.model.note(value))},
  pickup(event){this.model.pickup(event.currentTarget.dataset.value)},
  askPay(){this.setData({confirmPay:true})},
  cancelPay(){this.setData({confirmPay:false})},
  pay(){
    if(this.paying)return
    this.paying=true
    try{const order=this.model.place(this.data.cartKind);this.go('order',{orderId:order.id,active:'orders'});this.feedback('模拟下单成功，没有发生真实扣款')}catch(error){this.setData({confirmPay:false});this.feedback(error.message)}finally{this.paying=false}
  },
  openOrder(event){this.go('order',{orderId:event.currentTarget.dataset.id,active:'orders'})},
  transition(event){try{this.model.transition(this.data.orderId,event.currentTarget.dataset.action);this.feedback('演示订单状态已更新')}catch(error){this.feedback(error.message)}},
  reorder(){const order=this.model.order(this.data.orderId);if(!order)return;order.lines.forEach(line=>this.model.add(order.kind,line.id,line.spec,line.quantity));this.go('cart',{cartKind:order.kind})},
  askReset(){this.setData({resetConfirm:true})},
  cancelReset(){this.setData({resetConfirm:false})},
  reset(){this.runtime.reset();this.go('home',{active:'home',query:'',category:'全部',foodCategory:'全部',orderFilter:'all',counter:0,basicValue:'',motionOffset:0,orderId:null});this.feedback('演示数据已重置')}
})
