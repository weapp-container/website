---
id: "docs/engineering/sdk-flutter/weapp_container_ios/index"
title: "Weapp 容器 iOS 实现"
section: "SDK 工程"
summary: "Weapp 容器 iOS 实现。来自 weapp-container/sdk-flutter 的版本化工程说明。"
route: "/docs/engineering/sdk-flutter/weapp_container_ios/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "7132d897cbcb28bd85155cad916b4ed73451d667"
sourcePath: "weapp_container_ios/README.md"
---

<a id="weapp-container-ios-implementation"></a>
# Weapp 容器 iOS 实现

**简体中文** · [English](/en/docs/engineering/sdk-flutter/weapp_container_ios/index/)

当前主分支准备 preview.7 公开发行；只有对应版本在注册源发布后才使用公开安装入口。安装、平台要求与状态见 [SDK 首页](/docs/engineering/sdk-flutter/index/)。下方源码说明使用 preview.7；从 SDK 首页给出的精确提交构建，并使用同版本运行库。旧锁只用于历史兼容，当前准备工具默认读取版本化的 preview.7 公开锁。

`weapp_container` 的联邦 iOS 插件，使用 UiKitView 和公开 `WeappContainer` Pod `0.1.0-preview.7.0`。应用 Podfile 须添加 `https://github.com/weapp-container/Specs.git` 和 `https://cdn.cocoapods.org/` 两个源。最低 iOS 16，编译要求 Xcode 27.2+。插件只包含 Swift 接入层，XCFramework 由依赖 Pod 提供；消费时无需兄弟仓库、Node 或 Cargo。
