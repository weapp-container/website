---
id: "api"
title: "小程序 API 与能力"
section: "API 参考"
summary: "按能力组检索 API、宿主覆盖、引擎覆盖和 conformance 证据。"
route: "/docs/api/"
locale: "zh-CN"
---

API 参考

<a id="mini-program-api-and-capabilities"></a>
# 小程序 API 与能力

**简体中文** · [English](api.en.md)


接口目录包含 29 个能力组。每个分组保留清单中的宿主与引擎状态、权限要求、版本条件和 conformance 案例编号。

**如何阅读覆盖状态**

组级状态概览不能替代逐平台状态。请在分组页查看具体宿主和引擎列；只有清单列出逐平台覆盖的能力才显示平台结论。默认 manifest 能力值也不等同于当前宿主已经实现该能力。

<a id="basics-and-lifecycle"></a>
## 基础与生命周期

- [**能力查询**`capability.query`1 个 API 或能力名称 · 清单标为完整](/docs/api/capability-query/)
- [**应用生命周期**`lifecycle.app`10 个 API 或能力名称 · 部分支持](/docs/api/lifecycle-app/)
- [**系统与设备信息**`system.info`15 个 API 或能力名称 · 部分支持](/docs/api/system-info/)
- [**小程序账号信息**`system.account-info`1 个 API 或能力名称 · 清单标为完整](/docs/api/system-account-info/)

<a id="routing-and-interface"></a>
## 路由与界面

- [**页面导航与页面栈**`navigation.page-stack`7 个 API 或能力名称 · 部分支持](/docs/api/navigation-page-stack/)
- [**小程序间导航**`wx.mini-program-navigation`1 个 API 或能力名称 · 部分支持](/docs/api/wx-mini-program-navigation/)
- [**界面反馈与导航栏**`wx.ui-feedback`8 个 API 或能力名称 · 部分支持](/docs/api/wx-ui-feedback/)

<a id="pages-and-components"></a>
## 页面与组件

- [**页面数据更新**`data.setData`2 个 API 或能力名称 · 部分支持](/docs/api/data-setData/)
- [**WXML、WXSS 与模板组件**`view.wxml-wxss`4 个 API 或能力名称 · 部分支持](/docs/api/view-wxml-wxss/)
- [**模板事件绑定**`event.bindings`4 个 API 或能力名称 · 部分支持](/docs/api/event-bindings/)
- [**Animation 动画**`wx.animation`2 个 API 或能力名称 · 部分支持](/docs/api/wx-animation/)
- [**SelectorQuery**`wx.selector-query`2 个 API 或能力名称 · 部分支持](/docs/api/wx-selector-query/)
- [**IntersectionObserver**`wx.intersection-observer`2 个 API 或能力名称 · 部分支持](/docs/api/wx-intersection-observer/)
- [**MediaQueryObserver**`wx.media-query-observer`2 个 API 或能力名称 · 部分支持](/docs/api/wx-media-query-observer/)
- [**组件选择与关系查询**`component.selection`5 个 API 或能力名称 · 部分支持](/docs/api/component-selection/)
- [**组件关系**`component.relations`3 个 API 或能力名称 · 部分支持](/docs/api/component-relations/)
- [**组件自定义事件**`component.events`1 个 API 或能力名称 · 部分支持](/docs/api/component-events/)

<a id="runtime-and-storage"></a>
## 运行时与存储

- [**定时器**`timer`5 个 API 或能力名称 · 部分支持](/docs/api/timer/)
- [**本地存储**`wx.storage`10 个 API 或能力名称 · 部分支持](/docs/api/wx-storage/)
- [**文件系统**`wx.filesystem`12 个 API 或能力名称 · 部分支持](/docs/api/wx-filesystem/)

<a id="media-and-canvas"></a>
## 媒体与画布

- [**Canvas 绘制**`wx.canvas`3 个 API 或能力名称 · 部分支持](/docs/api/wx-canvas/)
- [**离屏 Canvas**`wx.canvas-offscreen`1 个 API 或能力名称 · 部分支持](/docs/api/wx-canvas-offscreen/)
- [**媒体、相机、扫码与位置**`wx.media-camera-location`8 个 API 或能力名称 · 部分支持](/docs/api/wx-media-camera-location/)
- [**音频上下文**`wx.inner-audio-context`2 个 API 或能力名称 · 部分支持](/docs/api/wx-inner-audio-context/)
- [**视频上下文**`wx.video-context`1 个 API 或能力名称 · 部分支持](/docs/api/wx-video-context/)

<a id="host-and-system-capabilities"></a>
## 宿主与系统能力

- [**权限设置**`wx.permission`4 个 API 或能力名称 · 部分支持](/docs/api/wx-permission/)
- [**网络请求与连接**`wx.request`6 个 API 或能力名称 · 部分支持](/docs/api/wx-request/)
- [**登录、用户与支付**`wx.auth-payment`6 个 API 或能力名称 · 部分支持](/docs/api/wx-auth-payment/)
- [**剪贴板与设备状态**`wx.clipboard-device`7 个 API 或能力名称 · 部分支持](/docs/api/wx-clipboard-device/)

<a id="defaults-and-coverage-gaps"></a>
## 默认值与清单差异

- [**运行时默认能力**`115 项默认值`12 项能力尚无逐平台覆盖记录。默认值按单独来源列出。](/docs/api/capability-defaults/)

接口快照来自 `weapp-container/weapp-container`，来源提交 `6b2e8074c9ea`。清单 SHA-256：`2bc18f6f392d7c4a0b13ec371c412c196c97bc18321b64b9a864543393ad3317`。
