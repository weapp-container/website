const products = [
  {id:'bottle',name:'随行保温杯',subtitle:'MORROW / 保留生活的温度',category:'生活',price:12900,color:'#e1e8dd',image:'/assets/bottle.jpg',description:'轻巧的不锈钢杯身，陪你从清晨走到日落。500 mL 容量，适合通勤、散步和每一次小小出发。',specs:['岩白','苔绿','炭黑'],tag:'日常好物'},
  {id:'mug',name:'慢时光陶瓷杯',subtitle:'MORROW / 给自己一杯时间',category:'生活',price:8900,color:'#efe2d5',image:'/assets/mug.jpg',description:'温润釉面与舒适握感，把桌面变成自己的小角落。300 mL 容量，适合咖啡、茶与温热的牛奶。',specs:['奶油白','焦糖棕'],tag:'编辑推荐'},
  {id:'headphones',name:'轻听无线耳机',subtitle:'MORROW / 把世界调到喜欢的音量',category:'数码',price:39900,color:'#e5e2ee',image:'/assets/headphones.jpg',description:'简洁外观，轻盈佩戴。为专注、旅行和日常音乐而设计。本页面为模拟商品，不提供真实销售。',specs:['雾灰','午夜黑'],tag:'随身灵感'},
  {id:'bag',name:'城市漫游托特包',subtitle:'MORROW / 装下今天的好心情',category:'出行',price:15900,color:'#e7e5d8',image:'/assets/bag.jpg',description:'宽松容量，柔软帆布，整理随身小物也留一点自由。适合一本书、一台电脑和临时起意的城市漫游。',specs:['原色','墨绿'],tag:'轻装出发'}
]
const meals = [
  {id:'coffee',name:'燕麦拿铁',subtitle:'双份浓缩 · 丝滑燕麦奶',category:'咖啡',price:2600,color:'#eadfd1',image:'/assets/coffee.jpg',description:'香醇浓缩与燕麦奶的温柔搭配。',specs:['热 / 标准','冰 / 少冰'],tag:'人气推荐'},
  {id:'salad',name:'田园能量碗',subtitle:'新鲜蔬菜 · 谷物 · 烤南瓜',category:'轻食',price:4200,color:'#e1e8d3',image:'/assets/salad.jpg',description:'为午后补充一点新鲜的能量。',specs:['油醋汁','芝麻酱'],tag:'轻盈一餐'},
  {id:'pizza',name:'番茄芝士披萨',subtitle:'慢发酵饼底 · 番茄 · 莫扎里拉',category:'热食',price:5800,color:'#eddfce',image:'/assets/pizza.jpg',description:'新鲜烘烤，分享一份简单的快乐。',specs:['经典口味','加芝士 + ¥5'],extraPrices:[0,500],tag:'现点现做'}
]
const money = cents => (cents / 100).toFixed(2)
const find = (kind,id) => (kind === 'food' ? meals : products).find(item => item.id === id)
module.exports = {products,meals,money,find}
