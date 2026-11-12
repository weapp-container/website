---
id: "docs/engineering/sdk-flutter/weapp_container_android/index"
title: "Weapp 容器 Android 实现"
section: "SDK 工程"
summary: "Weapp 容器 Android 实现。来自 weapp-container/sdk-flutter 的版本化工程说明。"
route: "/docs/engineering/sdk-flutter/weapp_container_android/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "84ae8c14ae14c8d2f6fe44abe4a514f8d3e6ff60"
sourcePath: "weapp_container_android/README.md"
---

<a id="weapp-container-android-implementation"></a>
# Weapp 容器 Android 实现

**简体中文** · [English](/en/docs/engineering/sdk-flutter/weapp_container_android/index/)

当前主分支准备 preview.7 公开发行；只有对应版本在注册源发布后才使用公开安装入口。安装、平台要求与状态见 [SDK 首页](/docs/engineering/sdk-flutter/index/)。下方保留固定 preview.6 源码的详细说明；该版本须从 SDK 首页给出的精确提交 checkout 构建，不与 preview.7 运行库混用。


`weapp_container` 的联邦原生插件。使用混合组合和已安装的 `com.sonofmagic.weapp:weapp-container-android:0.1.0-preview.5.1` AAR。
分发构建器包含 `native/maven`；源码消费者可将 `weappSdkMavenDir` 设置为已验证的 SDK Maven 仓库。最低 Android API 为 26。
在消费的 Flutter 应用中不会发生 Cargo/JNI 源码构建。
