import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {createModel,restore,cleanText}=require('../../miniapp/lib/model.js')

test('commits and restored state cannot introduce glyphs rejected by the strict renderer font',()=>{
  assert.equal(cleanText('中文🙂\ud800',24),'中文□□')
  const model=createModel({schemaVersion:1,address:{name:'林🙂',phone:'123',detail:'上海\ud800'},foodNote:'不要辣🙂'})
  assert.equal(model.snapshot().address.name,'林□');assert.equal(model.snapshot().address.detail,'上海□')
  model.note('中文备注🙂');assert.equal(model.snapshot().foodNote,'中文备注□')
})

test('shopping checkout uses integer cents, snapshots address and clears only its bag',()=>{
  const notifications=[],model=createModel(null,state=>notifications.push(state))
  model.add('shop','bottle',1,2);model.add('shop','mug',0,1);model.add('food','coffee',1,1)
  assert.deepEqual(model.totals('shop'),{quantity:3,total:34700})
  const order=model.place('shop','2026-11-05T10:00:00.000Z')
  assert.equal(order.id,'WC000001');assert.equal(order.total,34700);assert.equal(order.status,'paid')
  assert.equal(model.totals('shop').quantity,0);assert.equal(model.totals('food').quantity,1)
  model.address('name','另一个人');assert.equal(model.order(order.id).address.name,'林小满')
  notifications.at(-1).address.name='outside mutation'
  assert.equal(model.snapshot().address.name,'另一个人')
})

test('food extras are charged per item, note is snapshotted and transitions are one way',()=>{
  const model=createModel()
  model.add('food','pizza',1,2);model.note('芝士多一点，谢谢！');model.pickup('店内用餐')
  assert.equal(model.totals('food').total,12600)
  const order=model.place('food','2026-11-05')
  assert.equal(order.note,'芝士多一点，谢谢！');assert.equal(order.pickup,'店内用餐');assert.equal(order.status,'preparing')
  assert.equal(model.snapshot().foodNote,'');assert.equal(model.totals('food').quantity,0)
  model.transition(order.id,'complete');assert.equal(model.order(order.id).status,'completed')
  assert.throws(()=>model.transition(order.id,'cancel'),/当前订单状态/)
})

test('empty and invalid checkouts do not create orders',()=>{
  const model=createModel()
  assert.throws(()=>model.place('shop'),/先选/)
  model.add('shop','bag');model.address('phone','不是电话号码')
  assert.throws(()=>model.place('shop'),/补全/)
  assert.equal(model.snapshot().orders.length,0);assert.equal(model.totals('shop').quantity,1)
  assert.throws(()=>model.add('shop','unknown'),/有效商品/)
  assert.throws(()=>model.add('shop','bag',99),/有效商品/)
  assert.throws(()=>model.add('shop','bag',0,NaN),/有效商品/)
})

test('quantity cap, removal, restoration and untrusted totals preserve catalog ownership',()=>{
  const model=createModel()
  model.add('shop','bottle',0,99);model.add('shop','bottle',0,5)
  assert.equal(model.totals('shop').quantity,20)
  for(let i=0;i<20;i++)model.quantity('shop','bottle:0',-1)
  assert.equal(model.totals('shop').quantity,0)
  const data=restore({schemaVersion:1,cart:[{id:'headphones',spec:0,quantity:2,price:1},{id:'bad',spec:0,quantity:8}],foodCart:[],orders:[{id:'WC000009',kind:'food',status:'completed',lines:[{id:'pizza',spec:1,quantity:2}],total:1,createdAt:'today'}],nextOrder:1})
  const restored=createModel(data)
  assert.equal(restored.totals('shop').total,79800)
  assert.equal(restored.order('WC000009').total,12600)
  assert.equal(restored.snapshot().nextOrder,10)
})

test('reset restores seeded fictional address, empties both bags and emits a new snapshot',()=>{
  let snapshot
  const model=createModel(null,state=>{snapshot=state})
  model.add('food','coffee');model.add('shop','bag');model.place('food');model.address('detail','temporary')
  const revision=model.snapshot().revision
  model.reset()
  assert.equal(model.snapshot().cart.length,0);assert.equal(model.snapshot().foodCart.length,0);assert.equal(model.snapshot().orders.length,0)
  assert.equal(snapshot.revision,revision+1);assert.match(snapshot.address.detail,/演示路/)
})
