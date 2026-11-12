---
id: "docs/engineering/sdk-flutter/weapp_container_android/index"
title: "Weapp 容器 Android 实现"
section: "SDK 工程"
summary: "Weapp 容器 Android 实现。来自 weapp-container/sdk-flutter 的版本化工程说明。"
route: "/docs/engineering/sdk-flutter/weapp_container_android/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "2a6a2f0096b894e69d7049064d87072d8e5b3901"
sourcePath: "weapp_container_android/README.md"
---

<a id="weapp-container-android-implementation"></a>
# Weapp 容器 Android 实现

**简体中文** · [English](/en/docs/engineering/sdk-flutter/weapp_container_android/index/)


`weapp_container` 的联邦原生插件。使用混合组合和已安装的 `com.sonofmagic.weapp:weapp-container-android:0.1.0-preview.5.1` AAR。
分发构建器包含 `native/maven`；源码消费者可将 `weappSdkMavenDir` 设置为已验证的 SDK Maven 仓库。最低 Android API 为 26。
在消费的 Flutter 应用中不会发生 Cargo/JNI 源码构建。
