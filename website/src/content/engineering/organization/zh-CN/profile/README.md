---
id: "docs/engineering/organization/profile/index"
title: "Weapp Container"
section: "项目与维护"
summary: "Weapp Container。来自 weapp-container/.github 的版本化工程说明。"
route: "/docs/engineering/organization/profile/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/.github"
sourceCommit: "85ea97e8f8e4ec3c75b2d0fadaa75cde40a57d74"
sourcePath: "profile/README.md"
---

<p align="center"><img src="/documentation/e9cc10702f6ab5856a0b21dfa0f1f7f77aaecceb8b2c914a39b079f53fae5c84.svg" width="96" height="96" alt="Weapp Container" /></p>

<a id="从工程到应用的闭环"></a>
<a id="开放与许可"></a>
# Weapp Container

**简体中文** · [English](/en/docs/engineering/organization/profile/index/)

将小程序嵌入自己的应用。Weapp Container 提供公开的 Rust 运行时、独立 portable pack 打包工具、开发模拟器与宿主 SDK。输入可以是原生小程序目录或已有框架的构建产物，weapp-vite 是可选构建工具。

[开发文档](https://container.weapp.dev/docs/) · [在线演示](https://container.weapp.dev/demo/) · [核心源码](/docs/engineering/weapp-container/index/) · [平台状态](https://container.weapp.dev/docs/platforms/)

<a id="getting-started"></a>
## 开始使用

先生成一个独立测试包，无需安装小程序框架或 npm 依赖：

```sh
git clone https://github.com/weapp-container/sdk-contract.git
cd sdk-contract
node fixtures/make-acceptance-pack.mjs --out ../hello-pack
```

然后选择宿主，按接入指南从公开源码构建匹配运行库，将 SDK 视图加入应用并加载 `hello-pack/`。自己的原生小程序通过[独立打包工具](https://container.weapp.dev/docs/pack/)生成相同格式。在线演示只运行固定包，不能接收任意上传。

<a id="integrations"></a>
## 选择接入入口

| 宿主 | 仓库 | 主要内容 |
| --- | --- | --- |
| Android | [sdk-android](/docs/engineering/sdk-android/index/) | Kotlin Session、原生视图与消息 |
| iOS | [sdk-ios](/docs/engineering/sdk-ios/index/) | Swift 会话、UIKit / SwiftUI |
| C++ Desktop | [sdk-desktop](/docs/engineering/sdk-desktop/index/) | C/C++ Session、原生子视图和平台呈现器 |
| Flutter | [sdk-flutter](/docs/engineering/sdk-flutter/index/) | Dart Controller、Widget 与原生适配 |
| React Native | [sdk-react-native](/docs/engineering/sdk-react-native/index/) | Fabric View、Controller 与 TurboModules |
| 自有宿主与工具 | [sdk-contract](/docs/engineering/sdk-contract/index/) | 共享 C ABI、类型与协议 |
| 网站与示例 | [website](/docs/engineering/website/index/) | 中英文文档与固定 Web 演示 |

当前为 **preview**。构建、安装、运行、设备与 GPU 验收分别记录；文档翻译不代表新增平台支持。HarmonyOS 提供已有宿主示例，其状态见平台文档，不作为独立公开 SDK。API 按 29 个能力组组织，115 项默认能力不等于宿主已实现，12 项平台覆盖缺口明确保留。

<a id="development"></a>
## 开发与贡献

从[核心仓库中文 README](/docs/engineering/weapp-container/index/)开始准备 Node.js 24.x、pnpm、Rust 和平台工具链。错误报告提交到对应仓库，安全问题遵循[安全指南](/docs/engineering/weapp-container/security/)，贡献前阅读[贡献指南](/docs/engineering/weapp-container/contributing/)。

<a id="license-and-history"></a>
## 许可与历史

自有源码以 Apache-2.0 公开，少数核心 crate 保留 MIT OR Apache-2.0；第三方组件遵循各自许可。具体以每个仓库和获得的副本所附 LICENSE、NOTICE 及 RUNTIME-LICENSE 为准。

历史运行库归档保留原有许可与哈希，公开源码不重新授权旧二进制，也不保证旧下载 pin 可用。当前接入优先从匹配公开源码构建；历史迁移与归档边界见[迁移文档](https://container.weapp.dev/docs/engineering/weapp-container/docs/runtime-artifacts-migration/)。
