---
id: "docs/engineering/website/docs/devices"
title: "Web 演示设备"
section: "运行时与宿主"
summary: "Web 演示设备。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/docs/devices/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "269411e03828e9d77714eb9c6aec87dbadd35e2d"
sourcePath: "docs/devices.md"
---

<a id="web-presentation-equipment"></a>
# Web 演示设备

**简体中文** · [English](/en/docs/engineering/website/docs/devices/)


本轮全屏与 `hostLayout` 改动的验证范围见 [Duo 全屏验收记录](/docs/engineering/website/docs/duo-fullscreen-verification/)。[candidate9 历史记录](/docs/engineering/website/docs/duo-verification/) 保留其原有候选身份与结论。

设备尺寸统一维护在 [`website/device-profiles.json`](https://github.com/weapp-container/website/blob/269411e03828e9d77714eb9c6aec87dbadd35e2d/website/device-profiles.json)。官网和 iframe 消费同一注册表；staging 校验两种方向的几何结构和已核验标记后，将注册表写入哈希资产闭包。来源字段用于追溯独立测量，staging 不会重新运行 UIKit witness 或核对私有原始记录。URL 只接受 `scene`、`device`、`display`、`rotation`，其中 `rotation` 为 `0` 或 `90`，不能指定任意运行库、pack 或权限。

默认设备是 **iPhone Duo 展开内屏的自然方向**：实际 Open 操作后的整屏为 `951 × 669` pt，方向为 landscape，安全内容区域为 `867 × 635` pt，模拟 DPR 为 `3`。旋转后的内屏为 `669 × 951` pt，安全内容区域为 `669 × 835` pt。这里的 `0` 表示真实采样起始姿态；它不等于统一的竖屏，也不能通过交换分辨率轴推导。

官网通过“演示设备”选择型号；Duo 内屏显示“折叠屏幕”按钮，切换到外屏后显示“展开屏幕”，与“旋转屏幕”并列。当前内/外屏状态和整屏尺寸由预览上方 caption 显示。折叠仅改变显示屏选择，保留当前旋转值、会话、购物车和订单；切换期间按钮不可重复触发。

| 设备 / 显示屏 | rotation 0 整屏 / 渲染窗口 | rotation 90 整屏 / 渲染窗口 | DPR |
| --- | --- | --- | --- |
| iPhone Duo 内屏 | 951 × 669 / 951 × 669 | 669 × 951 / 669 × 951 | 3 |
| iPhone Duo 外屏 | 466 × 678 / 466 × 678 | 678 × 466 / 678 × 466 | 3 |
| iPhone 18 Pro | 402 × 874 / 402 × 874 | 874 × 402 / 874 × 402 | 3 |
| iPhone 18 Pro Max | 440 × 956 / 440 × 956 | 956 × 440 / 956 × 440 | 3 |
| iPhone 17 | 402 × 874 / 402 × 874 | 874 × 402 / 874 × 402 | 3 |
| Pixel 7 网页预览 | 412 × 839 / 412 × 839 | 863 × 360 / 863 × 360 | 2.625 |
| iPad mini (A17 Pro)| 744 × 1133 / 744 × 1133| 1133 × 744 / 1133 × 744| 2|

<a id="measurement-source-and-coordinates"></a>
## 测量来源与坐标

Apple 数据采样于 2026-11-06，使用 Xcode 27.2（27B52）、Swift 6.4.2 编译的独立 UIKit witness，仅导入 UIKit，没有导入容器 SDK。通过任务专属模拟器和 Device Hub 执行真实 Open / Closed、Rotate Right 操作。Duo 使用 iOS 27.2（24B91016s），其他 iPhone 使用 iOS 27.2（24B8117），iPad mini A17 Pro 使用支持该型号的 iOS 27.0（24A434）。注册表 `source` 记录工具链、runtime build 和 witness 的源码及二进制 SHA-256；原始测量和截图留在私有验证产物中。

- `width` / `height` 是所属 `UIWindowScene.screen.coordinateSpace` 中的整屏 points；`orientation` 来自真实 interface orientation。
- `safeArea` 是当前方向的 `UIWindow.safeAreaInsets`。它只作为注册表原始采样记录。iframe 从屏幕原点覆盖完整屏幕，guest 通过同一窗口快照的 `hostLayout.safeInsets` 保护内容和控件。
- `metricsSafeArea` 是 UIKit 安全矩形转换到 `screen.fixedCoordinateSpace` 后的六字段矩形；`screenFixed` 记录该坐标空间的尺寸。它作为 `metrics.safeArea` 原样传入运行时，不能按当前横竖屏猜测轴或镜像。
- 例如 Duo 内屏 rotation 90 的当前内容顶部为 `82`，固定坐标安全矩形顶部为 `34`。两者属于不同坐标空间，不能互相替代。Duo 当前方向右侧 `84` pt 的 inset 同样来自实测。

Pixel 7 使用安装的 Playwright **1.56.1** `Pixel 7` 和 `Pixel 7 landscape` 两个网页内容窗口预设，未采样原生 Android 安全区。两个演示窗口分别为 `412 × 839` 和 `863 × 360`，横屏不是竖屏尺寸换轴。预设屏幕 `412 × 915` 和 `915 × 412` 仅记录在各方向的 provenance 中；演示将浏览器内容窗口作为逻辑整屏，不虚构状态栏高度或原生 insets。界面明确标为“网页预览”，测试直接对照已安装版本的两个 descriptor。

这些是模拟器或浏览器预览记录，不能作为真机安装、签名或真机交互验证的证明。真机验证需要独立记录设备、系统、构建身份和运行结果。

UIKit witness 的测量证明注册表来源，Web 设备验收证明浏览器宿主行为，原生 Showcase 验收证明对应的原生宿主行为；三者各自记录，不能互相替代。本次最终候选的原生 Duo 交互以该候选的独立运行证据为准，`platforms/status.json` 中尚未完成的验收项继续保留。

Duo 的完整 surface、局部安全区、`verticalBarEdge` 和有效保留区域已使用链接 iOS 27.2 SDK 的独立 witness 重新采集。外屏和内屏自然方向的实际物理侧栏边缘为右侧，内屏旋转 90 时为无侧栏；这些状态直接存入注册表，运行时不按型号或方向推断。外屏旋转后的遮挡位于右下，侧栏控件避让该有效区域。完全展开没有有效折叠区域，因此不会常驻折痕空隙。部分折叠的区域由原生动态快照提供；网页仅提供已登记的展开／折叠外屏和旋转状态。

<a id="lifecycle-and-rendering"></a>
## 生命周期与渲染

切换设备型号或演示场景时，宿主先发送带版本和 request ID 的关闭请求，收到当前 iframe 的实际 Worker 关闭回执后才创建新 owner。超时不会静默替换不确定的 owner。折叠和旋转保留同一会话：宿主先暂停交互并调整外框；iframe 调用 `setWindowMetrics` 安装输入围栏后再调整完整内部渲染窗口和内容布局。匹配的新 viewport 已呈现、metrics fence 已打开且输入可用后，宿主才更新已确认的设备选择与 URL 并恢复交互。失败时显示错误，需重新加载演示。

消息同时校验 origin、iframe Window、协议版本和 request ID。过期回执、旧 owner 的回执和重复请求不会提交后续事务。切换期间输入被暂停，购物车及订单继续使用原有状态桥。

模拟设备 DPR 与实际 Canvas 渲染密度分开：窗口 API 报告注册表 DPR，`renderScale: 'auto'` 按浏览器实际密度取值并封顶为 `2`。外框按可用宽度和高度缩放，不设置最小缩放比例；这个显示缩放不改变 guest 的逻辑窗口。

URL 的省略值始终回到 Duo 展开内屏的自然方向。设备和场景提交后使用 `replaceState` 更新链接，刷新可重放选择；不会为每次折叠建立额外历史条目。离开页面会关闭 guest owner；如果浏览器通过 BFCache 恢复历史页面，宿主会刷新该页面，从 URL 和持久状态创建新 owner。

渲染 viewport 现在覆盖完整屏幕，和屏幕尺寸一致。`hostLayout`（版本 1）单独记录当前 surface 局部安全边距、物理侧栏边缘和有效遮挡／折叠区域；它与旧 fixed-coordinate `safeArea` 独立。业务内容和控件使用该快照避让，背景保留完整覆盖。设备切换确认须匹配精确 metrics fence revision、完整已提交窗口快照和新画面，不能只比较宽高。


<a id="page-uses-hostlayout"></a>
## 页面使用 hostLayout

`wx.getWindowInfo().hostLayout` 是容器扩展字段。版本 1 的坐标原点是实际渲染 View 的左上角，单位为逻辑 points；嵌入窗口时仍使用该 View 的局部坐标。它与 fixed-coordinate `safeArea` 的语义不同：页面不能从后者直接推算局部安全边距，也不能在宿主和页面中重复扣除同一安全区。

```js
// wx.getWindowInfo() 的 hostLayout 示例；数值以当前宿主快照为准。
const exampleHostLayout = {
  version: 1,
  safeInsets: { top: 0, right: 84, bottom: 34, left: 0 },
  verticalBarEdge: 'right',
  reservedRegions: [
    { id: 'occlusion:0', kind: 'occlusion', x: 867, y: 0, width: 84, height: 124 }
  ]
}
```

- `safeInsets` 保护内容和可点击控件；背景与 CanvasKit 渲染表面继续覆盖完整 `windowWidth × windowHeight`。
- `verticalBarEdge` 是已解析为物理方向的 `left`、`right` 或 `none`。页面按该值安排侧边导航或水平导航，不能再按设备名、横竖屏或 RTL 自行镜像一次。
- `reservedRegions` 仅包含当前有效的 `occlusion` 或 `division` 矩形，平台已计入避让边距。页面据此分隔可用内容列、为弹窗选择完整可用区域；不再次扩张矩形，也不在完全展开后保留已消失的折痕空隙。区域 ID 只用于当前快照，不作为跨姿态的永久标识。

页面初次加载时同步查询窗口，在尺寸和布局两类回调中读取新快照，并在卸载时注销布局监听：

```js
Page({
  data: { windowWidth: 0, windowHeight: 0, hostLayout: null },
  onLoad() {
    this.layoutChanged = () => this.readWindow()
    wx.onHostLayoutChange(this.layoutChanged)
    this.readWindow()
  },
  onResize() { this.readWindow() },
  onUnload() { wx.offHostLayoutChange(this.layoutChanged) },
  readWindow() {
    const info = wx.getWindowInfo()
    this.setData({
      windowWidth: info.windowWidth,
      windowHeight: info.windowHeight,
      hostLayout: info.hostLayout ?? null,
    })
  },
})
```

`wx.onHostLayoutChange` 的参数为 `{ hostLayout }`；扩展被移除时为 `{ hostLayout: null }`。窗口尺寸不变但侧栏、遮挡或折叠区域改变时，只触发布局事件，不误发 `onResize`。窗口信息先原子更新，回调中的同步查询随即读到新快照。接入方仍应处理扩展字段缺失的旧宿主；缺失值不表示已观测到零安全边距。

这些变化同样会撤销旧触摸和呈现权限；新的匹配画面呈现并确认后，当前会话才恢复交互。业务页面不保存旧布局坐标继续投递输入，也不以只读采集结果授权呈现。

iOS 27.1+ 从实际 View 的 `traitCollection.verticalBarEdge`、`reservedRegions(kind:)`、`safeAreaInsets` 和 `traitCollection.displayScale` 采集；leading/trailing 在宿主中按当前布局方向解析为物理边缘。iOS 16 起仍有兼容的安全区采集路径。公开 iOS `captureWindowMetrics()` 返回同一完整快照，未挂载、无有效布局或解绑期间返回 `nil`；它不创建运行时、不推进布局观测身份，也不改变渲染权限。Flutter iOS 使用此采集入口并保留请求 owner、取消和过期结果检查。

官网外框的缩放分别受可用宽度和视口高度约束，再用缩放后的实际外框高度设置舞台占位。舞台高度不再反过来作为缩放计算的可用高度，避免 `ResizeObserver` 反馈循环产生上下空白。该预览缩放与模拟 DPR、Canvas backing-store 倍率各自独立。
