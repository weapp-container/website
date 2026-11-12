---
id: "docs/engineering/sdk-flutter/weapp_container_ios/index"
title: "Weapp 容器 iOS 实现"
section: "SDK 工程"
summary: "Weapp 容器 iOS 实现。来自 weapp-container/sdk-flutter 的版本化工程说明。"
route: "/docs/engineering/sdk-flutter/weapp_container_ios/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "84ae8c14ae14c8d2f6fe44abe4a514f8d3e6ff60"
sourcePath: "weapp_container_ios/README.md"
---

<a id="weapp-container-ios-implementation"></a>
# Weapp 容器 iOS 实现

**简体中文** · [English](/en/docs/engineering/sdk-flutter/weapp_container_ios/index/)

当前主分支准备 preview.7 公开发行；只有对应版本在注册源发布后才使用公开安装入口。安装、平台要求与状态见 [SDK 首页](/docs/engineering/sdk-flutter/index/)。下方保留固定 preview.6 源码的详细说明；该版本须从 SDK 首页给出的精确提交 checkout 构建，不与 preview.7 运行库混用。


`weapp_container` 的联邦原生插件。使用 UiKitView 和已安装的 Apple SDK 包装器，以及其原生通用 XCFramework。分发构建器包含 `ios/vendor/WeappContainer`。最低 iOS 版本为 16.0。在消费的 Flutter 应用中不会执行 Cargo 构建。
