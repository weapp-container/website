---
id: "index"
title: "文档首页"
section: "文档"
summary: "Weapp Container 开发文档、集成指南与 API 参考。"
route: "/docs/"
locale: "zh-CN"
---

开发文档

<a id="developer-documentation"></a>
# 开发文档

**简体中文** · [English](index.en.md)

把小程序嵌入已有应用。准备包、选择 SDK、挂载并加载，保留自己的小程序开发工具和框架。

<a id="get-started"></a>
## 开始使用

- [**快速开始**](/docs/start/)：三步接入：生成独立测试包、选择 SDK、挂载视图并加载。
- [**运行架构与生命周期**](/docs/architecture/)：了解 JS 引擎、Skia 呈现、宿主视图和会话资源的生命周期边界。
- [**配置与 portable pack**](/docs/pack/)：用独立工具打包原生小程序或已有框架产物，配置能力并校验资源。

<a id="platform-integrations"></a>
## 平台集成

- [**接入方式**](/docs/integrations/)：比较原生 Android、iOS、桌面、Flutter、React Native 和在线演示。
- [**Android**](/docs/integrations/android/)：以 Kotlin Session 与 View 将运行库嵌入 Android 应用。
- [**iOS**](/docs/integrations/ios/)：以 Swift Session 和 UIKit 视图接入 iOS。
- [**C++ Desktop**](/docs/integrations/desktop/)：用 C++ Session、原生子视图与平台呈现器接入桌面。
- [**Flutter**](/docs/integrations/flutter/)：通过 weapp_container Controller 和 Widget 接入五个平台。
- [**React Native SDK 接入**](/docs/integrations/react-native/)：通过 Fabric View 和 WeappContainerController 接入 Android 与 iOS。
- [**Web 在线演示**](/docs/integrations/web/)：了解固定在线体验的运行范围及通用 Web SDK 的当前状态。
- [**HarmonyOS 示例**](/docs/integrations/harmony/)：查看 ArkTS Showcase 示例与当前构建、安装和运行验证状态。

<a id="api-reference"></a>
## API 参考

- [**宿主 SDK API**](/docs/sdk-api/)：跨平台 Session、Controller、View、事件和宿主消息 API 概览。
- [**小程序 API 与能力**](/docs/api/)：按能力组检索 API、宿主覆盖、引擎覆盖和 conformance 证据。
- [**运行时默认能力**](/docs/api/capability-defaults/)：查看运行时 manifest 能力默认值，以及尚无逐平台状态的条目。
- [**组件与模板兼容性**](/docs/components/)：查看 WXML、WXSS、组件关系和交互能力的记录边界。

<a id="releases-and-support"></a>
## 发行与支持

- [**平台状态与支持边界**](/docs/platforms/)：按平台查看构建、安装、运行与签名状态。
- [**许可、下载与发行**](/docs/licensing/)：区分 SDK 源码许可、运行库许可、仓库访问和二进制发行授权。
- [**故障排查**](/docs/troubleshooting/)：排查 manifest、哈希、宿主生命周期、布局与渲染问题。

<a id="engineering-reference"></a>
## 进阶工程文档

展开侧边栏的**进阶工程文档**，可阅读固定公开提交中的架构、渲染、协议、验证、Rust crate、工具和示例说明。每页源码链接标明具体版本。

**预览版状态**

源码可用、二进制发行与平台验收分别记录。文档和翻译保留已有结论，不代表新增平台支持。
