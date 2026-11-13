---
id: "docs/engineering/weapp-container/examples/apps/reference-app/index"
title: "参考小程序"
section: "示例"
summary: "参考小程序。来自 weapp-container/weapp-container 的版本化工程说明。"
route: "/docs/engineering/weapp-container/examples/apps/reference-app/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df94e03e3bfd506719d6849f45bbb078f3b4f974"
sourcePath: "examples/apps/reference-app/README.md"
---

<a id="reference-mini-program"></a>
# 参考小程序

**简体中文** · [English](/en/docs/engineering/weapp-container/examples/apps/reference-app/index/)


这是模拟器和宿主嵌入示例中使用的简易应用。它测试了应用和页面的生命周期钩子、查询数据、WXML 绑定、WXSS 布局、事件以及 `setData`。

`data.lifecycleTrace` 记录了 App 和页面自身执行的回调。
初始追踪为：`app:launch → app:show → page:load → page:show → page:ready`；
后台/恢复阶段增加：`app:hide → page:hide → app:show → page:show`。
`onResize` 同时将实际的 `wx.getWindowInfo()` 返回值复制到 `data.windowInfo`。`moduleScopeHostInfo` 在 `App(...)` 执行前捕获窗口、设备、系统和设置 API；`resizeHostInfo` 在重置回调中捕获这些信息，`tapHostInfo` 在真实页面点击时捕获，`showHostInfo` 在页面前景回调期间捕获。
Android 验证会将这些快照与独立的 `adb shell wm
size` 和 `wm density` 观测结果进行对比，包括密度变化以及任何预先存在的显示覆盖的恢复。在暂停期间发生密度变化时，也会在 `onShow` 之前检查新快照是否可用。仅凭宿主标签无法证明这些回调已执行，或初始 JS 缓存在模块加载前已安装。
这些回调的组合顺序构成运行时回归契约；现有的独立 DevTools App/Page 追踪尚不足以证明在固定官方基准下背景流程的组合顺序。

原生 `components/managed-counter` 示例接收一个对象值的 `config` 属性，维护自身的计数器，并渲染页面拥有的插槽内容。点击 `#component-increment` 仅更新组件计数；点击插槽中的 `#component-slot` 文本内容，通过页面处理器更新页面计数。原始的页面控件和 ID 仍可用于模拟器烟雾测试。

从仓库根目录使用固定的 `weapp-vite` 子模块构建：

```sh
pnpm --dir vendor/weapp-vite exec wv build \
  "$PWD/examples/apps/reference-app" -p weapp \
  --outDir dist
pnpm container:pack -- examples/apps/reference-app/dist \
  --out artifacts/reference-app/pack \
  --compiler-commit "$(git -C vendor/weapp-vite rev-parse HEAD)"
```

生成的 `artifacts/reference-app/pack` 目录包含
`manifest.json` 和 `blobs/sha256`。它是无头模拟器和原生嵌入示例共享的可移植输入。
