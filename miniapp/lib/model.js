const catalog = require('./catalog')
const glyphRanges = require('./font-coverage')
const MAX_QUANTITY = 20, MAX_ORDERS = 30
const clone = value => JSON.parse(JSON.stringify(value))
function hasGlyph(codepoint) {
  let first=0,last=glyphRanges.length-1
  while(first<=last){const middle=(first+last)>>1,range=glyphRanges[middle];if(codepoint<range[0])last=middle-1;else if(codepoint>range[1])first=middle+1;else return true}
  return false
}
function cleanText(value,max) {
  if(typeof value!=='string')return ''
  let output=''
  for(const character of value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')){
    const codepoint=character.codePointAt(0),display=codepoint<=32||hasGlyph(codepoint)?character:'□'
    if(output.length+display.length>max)break
    output+=display
  }
  return output
}
const empty = () => ({schemaVersion:1,revision:0,cart:[],foodCart:[],orders:[],address:{name:'林小满',phone:'138 0000 0000',detail:'上海市静安区 · 演示路 18 号'},foodNote:'',pickup:'到店自取',nextOrder:1})
function normalizedLines(value,kind) {
  if (!Array.isArray(value)) return []
  const lines = []
  value.slice(0,40).forEach(raw => {
    if (!raw || typeof raw !== 'object') return
    const item = catalog.find(kind,raw.id)
    if (!item || !Number.isInteger(raw.spec) || raw.spec < 0 || raw.spec >= item.specs.length || !Number.isInteger(raw.quantity) || raw.quantity < 1) return
    const existing = lines.find(line => line.id === item.id && line.spec === raw.spec)
    if (existing) existing.quantity = Math.min(MAX_QUANTITY,existing.quantity + raw.quantity)
    else lines.push({id:item.id,spec:raw.spec,quantity:Math.min(MAX_QUANTITY,raw.quantity)})
  })
  return lines
}
function lineDetails(lines,kind) {
  return lines.map(line => {
    const item = catalog.find(kind,line.id), price = item.price + ((item.extraPrices || [])[line.spec] || 0)
    return {...line,key:item.id+':'+line.spec,name:item.name,specText:item.specs[line.spec],image:item.image,color:item.color,price,priceText:catalog.money(price),subtotal:price*line.quantity,subtotalText:catalog.money(price*line.quantity)}
  })
}
function restore(value) {
  const state = empty()
  if (!value || value.schemaVersion !== 1) return state
  state.cart = normalizedLines(value.cart,'shop'); state.foodCart = normalizedLines(value.foodCart,'food')
  if (value.address && typeof value.address === 'object') {
    state.address = {name:cleanText(value.address.name,24),phone:cleanText(value.address.phone,24),detail:cleanText(value.address.detail,160)}
  }
  state.foodNote = cleanText(value.foodNote,120)
  if (['到店自取','店内用餐'].includes(value.pickup)) state.pickup = value.pickup
  state.nextOrder = Number.isSafeInteger(value.nextOrder) && value.nextOrder > 0 && value.nextOrder < 1000000 ? value.nextOrder : 1
  if (Array.isArray(value.orders)) value.orders.slice(0,MAX_ORDERS).forEach(raw => {
    if (!raw || !['shop','food'].includes(raw.kind) || !['paid','preparing','completed','cancelled'].includes(raw.status) || typeof raw.id !== 'string' || !/^WC\d{6}$/.test(raw.id)) return
    const lines = normalizedLines(raw.lines,raw.kind)
    if (!lines.length || state.orders.some(order=>order.id===raw.id)) return
    const details = lineDetails(lines,raw.kind), total = details.reduce((sum,line)=>sum+line.subtotal,0)
    state.orders.push({id:raw.id,kind:raw.kind,status:raw.status,lines,total,createdAt:cleanText(raw.createdAt,40),address:raw.kind==='shop'?{name:cleanText(raw.address && raw.address.name,24),phone:cleanText(raw.address && raw.address.phone,24),detail:cleanText(raw.address && raw.address.detail,160)}:null,note:cleanText(raw.note,120),pickup:raw.pickup==='店内用餐'?'店内用餐':'到店自取'})
    state.nextOrder = Math.max(state.nextOrder,Number(raw.id.slice(2))+1)
  })
  return state
}
function createModel(initial,onChange) {
  let state = restore(initial)
  function changed() { state.revision++; if(onChange) onChange(clone(state)); return clone(state) }
  function lines(kind) { return kind === 'food' ? state.foodCart : state.cart }
  return {
    snapshot:()=>clone(state),
    replace(value) { state=restore(value); return clone(state) },
    reset() { const revision=state.revision; state=empty(); state.revision=revision; return changed() },
    details(kind) { return lineDetails(lines(kind),kind) },
    totals(kind) { const details=lineDetails(lines(kind),kind); return {quantity:details.reduce((sum,line)=>sum+line.quantity,0),total:details.reduce((sum,line)=>sum+line.subtotal,0)} },
    add(kind,id,spec=0,quantity=1) {
      const item=catalog.find(kind,id)
      if (!item || !Number.isInteger(spec) || spec < 0 || spec >= item.specs.length || !Number.isInteger(quantity) || quantity < 1) throw new Error('请选择有效商品规格和数量')
      const list=lines(kind), current=list.find(line=>line.id===id&&line.spec===spec)
      if(current) current.quantity=Math.min(MAX_QUANTITY,current.quantity+quantity)
      else list.push({id,spec,quantity:Math.min(MAX_QUANTITY,quantity)})
      return changed()
    },
    quantity(kind,key,delta) {
      if (!Number.isInteger(delta) || Math.abs(delta)!==1) throw new Error('无效数量变化')
      const list=lines(kind),index=list.findIndex(line=>line.id+':'+line.spec===key)
      if(index<0) return clone(state)
      list[index].quantity=Math.min(MAX_QUANTITY,list[index].quantity+delta)
      if(list[index].quantity<1) list.splice(index,1)
      return changed()
    },
    address(field,value) {
      if(!['name','phone','detail'].includes(field)) throw new Error('无效地址字段')
      state.address[field]=cleanText(value,field==='detail'?160:24).trim(); return changed()
    },
    note(value) { state.foodNote=cleanText(value,120); return changed() },
    pickup(value) { if(!['到店自取','店内用餐'].includes(value)) throw new Error('无效取餐方式'); state.pickup=value; return changed() },
    place(kind,now) {
      const selected=lines(kind)
      if(!selected.length) throw new Error('先选几件喜欢的吧')
      if(kind==='shop' && (!state.address.name.trim() || !/^[\d +()-]{7,24}$/.test(state.address.phone) || !state.address.detail.trim())) throw new Error('请补全收货人、联系电话和地址')
      if(state.nextOrder>=1000000) throw new Error('演示订单已达上限，请重置演示')
      const order={id:'WC'+String(state.nextOrder++).padStart(6,'0'),kind,status:kind==='food'?'preparing':'paid',lines:clone(selected),total:this.totals(kind).total,createdAt:cleanText(now || new Date().toISOString(),40),address:kind==='shop'?clone(state.address):null,note:kind==='food'?state.foodNote:'',pickup:state.pickup}
      state.orders.unshift(order);state.orders=state.orders.slice(0,MAX_ORDERS)
      if(kind==='food') {state.foodCart=[];state.foodNote=''} else state.cart=[]
      changed();return clone(order)
    },
    transition(id,action) {
      const order=state.orders.find(item=>item.id===id)
      if(!order) throw new Error('订单不存在')
      if(action==='complete' && ['paid','preparing'].includes(order.status)) order.status='completed'
      else if(action==='cancel' && ['paid','preparing'].includes(order.status)) order.status='cancelled'
      else throw new Error('当前订单状态不能执行此操作')
      return changed()
    },
    order(id) { const order=state.orders.find(item=>item.id===id); return order ? {...clone(order),details:lineDetails(order.lines,order.kind),totalText:catalog.money(order.total)} : null }
  }
}
module.exports={createModel,restore,empty,cleanText,MAX_QUANTITY}
