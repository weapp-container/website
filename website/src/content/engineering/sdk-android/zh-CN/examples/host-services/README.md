---
id: "docs/engineering/sdk-android/examples/host-services/index"
title: "Android 宿主服务指南"
section: "示例"
summary: "Android 宿主服务指南。来自 weapp-container/sdk-android 的版本化工程说明。"
route: "/docs/engineering/sdk-android/examples/host-services/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-android"
sourceCommit: "f7b0d32da1614e7f52262ba42c9a70da647593a1"
sourcePath: "examples/host-services/README.md"
---

# Android 宿主服务指南

**简体中文** · [English](/en/docs/engineering/sdk-android/examples/host-services/index/)

本目录整理 Android 原生设备能力的接入说明。宿主服务默认按需启用，接入前先阅读[宿主能力总览](/docs/engineering/sdk-android/host-services/)，确认宿主上下文、权限代理和 session 生命周期的所有权。

| 指南 | 内容 |
| --- | --- |
| [Wi-Fi API](/docs/engineering/sdk-android/examples/host-services/wifi-apis/) | 支持的方法、系统权限、连接确认和网络路由边界 |
| [NFC API](/docs/engineering/sdk-android/examples/host-services/nfc-apis/) | Tag 技术对象、原生 I/O、取消和资源清理边界 |

实现代码可从 [AndroidWifiApis.kt](https://github.com/weapp-container/sdk-android/blob/f7b0d32da1614e7f52262ba42c9a70da647593a1/library/src/main/java/com/sonofmagic/weapp/container/sdk/AndroidWifiApis.kt) 和 [AndroidNfcTerminal.kt](https://github.com/weapp-container/sdk-android/blob/f7b0d32da1614e7f52262ba42c9a70da647593a1/library/src/main/java/com/sonofmagic/weapp/container/sdk/AndroidNfcTerminal.kt) 开始阅读。它们展示 SDK 内部适配方式，不能代替宿主应用自己的权限、生命周期和目标设备验收。
