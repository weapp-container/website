---
id: "docs/engineering/sdk-flutter/weapp_container_platform_interface/index"
title: "小程序容器平台接口"
section: "SDK 工程"
summary: "小程序容器平台接口。来自 weapp-container/sdk-flutter 的版本化工程说明。"
route: "/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "2a6a2f0096b894e69d7049064d87072d8e5b3901"
sourcePath: "weapp_container_platform_interface/README.md"
---

<a id="weapp-container-platform-interface"></a>
# 小程序容器平台接口

**简体中文** · [English](/en/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/)


联邦式 Flutter SDK 的内部可注入传输层。应用代码使用 `weapp_container`。方法/事件通道由共享的 `FLUTTER_PROTOCOL.md` 文档化；本包拥有 Dart 运行时时钟，并在初始化前进行订阅。所有实现共享 JSON 数据负载和原生 SDK 错误码。此接口中不会有任何原生指针或位图字节的交叉。
