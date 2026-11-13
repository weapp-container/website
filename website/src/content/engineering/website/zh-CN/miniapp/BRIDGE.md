---
id: "docs/engineering/website/miniapp/bridge"
title: "展示桥1"
section: "项目与维护"
summary: "展示桥1。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/miniapp/bridge/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "c487eff31a98ca75905b66676909cde218e9fb42"
sourcePath: "miniapp/BRIDGE.md"
---

<a id="showcase-bridge-1"></a>
# 展示桥1

**简体中文** · [English](/en/docs/engineering/website/miniapp/bridge/)


同一个 Skia 迷你应用程序在所有七个宿主中运行。它使用了SDK现有的
`weappContainer.postMessage`、`onMessage` 和 `offMessage` API。主人归来
包含 SDK 的 `sendMessage` 消息（Web: `WorkerWebSession.request('host.message', message)`）。
该协议是展示应用数据；它不是一个新的核心运行时 API。

每条消息都有 `protocolVersion: 1` 和 `sessionId`。客人生成一个
应用程序启动时的新会话 ID。宿主绝不能在所有者之间转发消息。
宿主应在加载包之前注册其消息侦听器。

<a id="state"></a>
## 状态

嘉宾 → 主持人：

```json
{"type":"showcase.state.ready","protocolVersion":1,"sessionId":"showcase-…"}
```

主持人→嘉宾（每场一次，重复准备无害）：

```json
{"type":"showcase.state.restore","protocolVersion":1,"sessionId":"showcase-…","state":null}
```

使用之前保存的状态对象而不是 `null` （如果可用）。
访客更改会产生具有相同信封的 `showcase.state.changed` 且
__代码_0__。仅保留 `state`；不得保存活动的 `sessionId` 并且
重复用作身份。宿主应立即返回其保存的快照。迟到了
用户更改数据后恢复将被忽略，因此无法删除新的
购物袋或订单。仅应用第一个接受的恢复。本土客人
存储空间可用时也会使用；宿主恢复优先于
第一个改变。 Web 宿主应保留其自己来源的 localStorage。

状态模式 1 包含 `cart`、`foodCart`、`orders`、`address`、`foodNote`、
`pickup`、`nextOrder` 和 `revision`。请勿编辑价格或总计：恢复
从目录中重建它们。每个规格数量限制为 20 个，
订单为最新 30 个，文本为记录的字段长度。未知产品
ID 和格式错误的订单被丢弃。重置会生成正常的更改快照。
无需真实姓名、电话或地址；所有种子值都是虚构的。

<a id="text-editing"></a>
## 文字编辑

嘉宾 → 主持人：

```json
{
  "type":"showcase.text.request","protocolVersion":1,
  "sessionId":"showcase-…","pageId":3,"requestId":"text-1",
  "field":"search","title":"搜索商品","value":"杯",
  "maxLength":40,"multiline":false
}
```

允许的字段：`search` (40)、`address.name` (24)、`address.phone` (24)、
`address.detail`（160，多行），`food.note`（120，多行）。宿主必须使用
原生文本编辑器，设置最大长度，支持普通中文输入法。
确认和取消是显式的用户操作。被解雇的编辑返回取消。

主持人→嘉宾：

```json
{"type":"showcase.text.commit","protocolVersion":1,"sessionId":"showcase-…","pageId":3,"requestId":"text-1","value":"保温杯"}
```

或者使用 `showcase.text.cancel` 具有相同的标识字段但没有值。
从正在应答的确切请求中复制 session/page/request 标识符。
主持人只能为一名业主保留一名编辑。客人发送
`showcase.text.dismiss` 与这些标识符当它导航离开时，启动一个
更换编辑器、重置或退役。关闭该确切的编辑器并稍后丢弃
原生结果。过时的会话、页面或请求永远不会改变访客状态。

`pageId` 是访客屏幕生成，而不是本机页面句柄。它递增
在每个内部导航上，包括离开和返回同一屏幕。
不接受任意的属性路径或评估。文本提交写入
仅由原始白名单请求选择的回调。

<a id="close"></a>
## 关闭

访客拥有可见的关闭按钮。它发送当前的 `showcase.state.changed` 快照，后跟 `showcase.close.request`，均包含 `protocolVersion: 1` 和活动的 `sessionId`。宿主仅接受其当前恢复的来宾身份的关闭，关闭其输入编辑器，耗尽状态持久性，然后关闭该所有者。宿主将表面渲染到实际视图边界；他们不会覆盖自己的状态或关闭控制。失败和关闭消息可以在退役后替换表面。

<a id="local-business-behavior"></a>
## 本地商业行为

路线是`pages/home/index`。启动查询 `scene=basic|shop|order` 打开
探索者、商店或食物菜单。八个内部屏幕共享一页一页
营业店；导航不需要原生 Chrome。

MORROW商店：搜索→类别→product/specification→购物袋→地址
→确认→模拟付款→下单→模拟receipt/cancellation.
每日表：类别→meal/specification→食物袋→pickup/note→模拟
付款→准备订单→模拟pickup/cancellation.完成并取消
订单可以再次订购。商店和食品袋保持独立。

价格为整数美分；规格附加内容仅包含一次。配售
订单获取其 lines/address/note 的不可变副本，并仅清除
对应的包。订单从不包含真正的支付令牌。用户界面使
支付和履行的模拟性质是明确的。

<a id="ownership-and-verification"></a>
## 所有权和验证

宿主拥有编辑UI、持久性、键盘和操作系统资源。客人拥有
目录、过滤、包内容、价格、订单转换、导航和反馈。
本机输入桥接不要求实现 miniapp `<input>` 或 IME。
无网络、登录、设备权限、钱包、任意包加载、游戏API
该样本需要
。宿主必须在关闭其所有者之前关闭其编辑器。

从展示存储库运行 `node --test tools/tests/miniapp-*.test.mjs` 。
这些测试验证业务和桥接状态机；实际的 Skia 渲染，
中文操作系统输入、滚动、平台打包需要宿主接受。
