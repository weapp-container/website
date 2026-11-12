export type Locale = 'zh-CN' | 'en';
export type DemoStatus = 'preparing' | 'loading' | 'ready' | 'closed' | 'closing' | 'scene' | 'resizing';
export const statusText: Record<DemoStatus, [string, string]> = {
  preparing: ['正在准备演示', 'Preparing demo'], loading: ['正在加载小程序', 'Loading mini-program'],
  ready: ['可以开始体验', 'Ready to explore'], closed: ['演示已关闭', 'Demo closed'],
  closing: ['正在关闭当前演示', 'Closing current demo'], scene: ['正在切换场景', 'Switching scene'],
  resizing: ['正在调整屏幕', 'Resizing screen'],
};
const english: Record<string, string> = {
  '逛一逛商城': 'Explore the shop', '从商品浏览到模拟结算': 'From browsing to a simulated checkout',
  '中文搜索与商品分类': 'Chinese search and product categories', '规格选择与购物车': 'Product options and shopping cart',
  '地址输入与模拟支付': 'Address input and simulated payments', '点一份喜欢的': 'Place a sample order',
  '从菜单选择到订单完成': 'From the menu to a completed order', '菜单分类与规格': 'Menu categories and options',
  '口味备注和数量调整': 'Order notes and quantities', '模拟制作状态与订单记录': 'Simulated preparation and order history',
  '试试基础交互': 'Try basic interactions', '探索小程序与宿主的连接': 'Explore the connection to the host',
  '点击、组件与滚动': 'Taps, components, and scrolling', '本地状态保存和恢复': 'Save and restore local state',
  '原生文字输入桥接': 'Native text input bridge',
  '演示运行库暂时无法加载，请稍后重试。': 'The demo runtime could not be loaded. Please try again.',
  '演示产物配置不完整。': 'The demo artifact configuration is incomplete.',
  '设备链接无效，请从在线体验页面重新打开。': 'Invalid device link. Please reopen the demo page.',
  '演示启动失败，请重新启动。': 'The demo failed to start. Please restart it.',
  '设备切换失败，请重新启动。': 'Device switching failed. Please restart the demo.',
  '演示尚未就绪。': 'The demo is not ready yet.', '场景切换未完成，请重新启动演示。': 'The scene switch did not finish. Please restart the demo.',
  '屏幕调整未完成，请重新启动演示。': 'Screen resizing did not finish. Please restart the demo.',
  '演示场景': 'Demo scenes', '选择体验设备': 'Choose a device', '演示设备': 'Demo device',
  '折叠屏幕': 'Fold screen', '展开屏幕': 'Unfold screen', '旋转屏幕': 'Rotate screen',
  '这里运行的是真实容器。所有商品和订单仅供演示，状态保存在当前设备。': 'This runs the actual container. Products and orders are samples; state is stored on this device.',
  '查看接入方式': 'Integration guide', '交互演示': ' interactive demo', '正在准备演示…': 'Preparing demo…',
  '重新加载': 'Reload', '重新启动当前演示': 'Restart current demo', '重新开始': 'Restart',
  '内屏': 'Inner display', '外屏': 'Outer display', '屏幕': 'Display', '主屏': 'Main display',
  '展开内屏': 'Unfolded inner display', '折叠外屏': 'Folded outer display', '网页预览': 'Browser preview',
};
export const demoText = (locale: Locale, value: string) => locale === 'en' ? english[value] || value : value;
