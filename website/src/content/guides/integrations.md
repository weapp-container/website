---
id: "integrations"
title: "接入方式"
section: "平台集成"
summary: "比较原生 Android、iOS、桌面、Flutter、React Native 和在线演示。"
route: "/docs/integrations/"
locale: "zh-CN"
---

平台集成

<a id="platform-integrations"></a>
# 接入方式

**简体中文** · [English](integrations.en.md)


按应用现有的语言或 UI 框架选择 SDK。各端使用同一种小程序包，无需更换小程序开发工具。普通接入使用平台指南列出的公开包管理器依赖或预编译 SDK 归档。

<a id="sdk-and-host"></a>
## SDK 与宿主

- [**Android**：Kotlin Session 与 GLES View，Android API 26+。](/docs/integrations/android/)
- [**iOS**：Swift Concurrency 与 UIKit 视图，iOS 16.0+。](/docs/integrations/ios/)
- [**C++ Desktop**：C++17 Session，macOS、Windows 与 Linux 宿主。](/docs/integrations/desktop/)
- [**Flutter**：`weapp_container` Controller 与 Widget；各平台验证状态分别记录。](/docs/integrations/flutter/)
- [**React Native**：Fabric View 与 TurboModule，React Native 0.88。](/docs/integrations/react-native/)
- [**Web 在线演示**：固定浏览器示例及其运行边界。](/docs/integrations/web/)
- [**HarmonyOS 示例**：ArkTS Showcase 与已有构建、运行记录。](/docs/integrations/harmony/)

<a id="common-steps"></a>
## 共通步骤

1. 按平台指南安装当前可用的 SDK 发行物。平台状态不同，先确认所需目标是否已有可用公开发行。
2. 把[测试包](/docs/start/#prepare-source)或[自己打好的包](/docs/pack/#own-miniapp)放进应用资源目录。
3. 创建会话、挂载视图、调用 `load`。退出功能时等待存储写回和会话关闭。

**预览版发行说明**

Android 可从 Maven Central 安装，Contract 与 React Native 包可从 npm 安装，Flutter 包可从 pub.dev 安装。iOS 和 Desktop 使用核心 prerelease 中的预编译归档。React Native 当前公开原生构建限 Android，Flutter Apple 平台归档不可用。SDK 包装层与运行库有各自的版本、许可证和发行记录。使用归档时核对发行页提供的哈希和许可。详见[许可、下载与发行](/docs/licensing/)及[SDK 发行状态](https://github.com/weapp-container/weapp-container/blob/main/docs/public-sdk-release.md)。

适用平台和实测边界请继续阅读 [平台状态与支持边界](/docs/platforms/)。
