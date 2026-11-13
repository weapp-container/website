---
id: "docs/engineering/weapp-container/docs/index"
title: "文档索引"
section: "运行时与宿主"
summary: "文档索引。来自 weapp-container/weapp-container 的版本化工程说明。"
route: "/docs/engineering/weapp-container/docs/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df94e03e3bfd506719d6849f45bbb078f3b4f974"
sourcePath: "docs/README.md"
---

<a id="documentation-index"></a>
# 文档索引

**简体中文** · [English](/en/docs/engineering/weapp-container/docs/index/)


第一次使用请从[快速开始](https://container.weapp.dev/docs/start/)进入；本目录主要说明运行时实现和工程边界。网站提供相同工程文档的固定版本快照。

<a id="integration-and-development"></a>
## 接入与开发

- [独立打包工具](/docs/engineering/weapp-container/tools/container-manifest/index/)：原生小程序或已有框架产物转换为 portable pack。
- [SDK 仓库和源码构建](/docs/engineering/weapp-container/docs/sdk-repositories/)：目标平台、运行库、包装层与产物许可。
- [模拟器](/docs/engineering/weapp-container/docs/simulator/)与[设备客户端](/docs/engineering/weapp-container/docs/dev-player/)：开发预览、输入、设备连接和故障定位。
- [宿主服务](/docs/engineering/weapp-container/docs/host-services/index/)：能力协商、生命周期、消息、权限与验证。

<a id="implementation-and-protocols"></a>
## 实现与协议

- [总体架构](/docs/engineering/weapp-container/docs/architecture/)、[AppService 执行](/docs/engineering/weapp-container/docs/appservice-execution/)和[独立 View 引擎](/docs/engineering/weapp-container/docs/isolated-view-engine/)。
- [布局](/docs/engineering/weapp-container/docs/layout-flow/)、[文字](/docs/engineering/weapp-container/docs/typography/)、[图片](/docs/engineering/weapp-container/docs/images/)、[滚动](/docs/engineering/weapp-container/docs/scrolling/)、[变换](/docs/engineering/weapp-container/docs/transforms/)和[合成](/docs/engineering/weapp-container/docs/compositing/)。
- [双渲染路径](/docs/engineering/weapp-container/docs/dual-renderer/index/)：浏览器 DOM、Skia、呈现确认与输入所有权。
- [渲染模式](/docs/engineering/weapp-container/docs/renderer-profiles/)、[资源存储](/docs/engineering/weapp-container/docs/render-resource-store/)与[性能](/docs/engineering/weapp-container/docs/performance/)。

<a id="compatibility-releases-and-collaboration"></a>
## 兼容性、发行与协作

- [能力矩阵](/docs/engineering/weapp-container/docs/capability-matrix/)、[API 与 conformance](/docs/engineering/weapp-container/docs/api-runtime-conformance/)、[官方工具验证](/docs/engineering/weapp-container/docs/conformance/index/)。
- [源码构建依赖](/docs/engineering/weapp-container/docs/rust-build-cache/)、[平台归档](/docs/engineering/weapp-container/docs/platform-runtime-artifacts/)与[发行工具](/docs/engineering/weapp-container/tools/runtime-artifacts/index/)。
- [许可](/docs/engineering/weapp-container/docs/licensing/)、[公开源码策略](/docs/engineering/weapp-container/docs/public-source-policy/)、[历史证据](/docs/engineering/weapp-container/docs/archived-evidence/)与[旧归档迁移](/docs/engineering/weapp-container/docs/runtime-artifacts-migration/)。
- [贡献](/docs/engineering/weapp-container/contributing/)、[安全报告](/docs/engineering/weapp-container/security/)和[行为准则](/docs/engineering/weapp-container/code_of_conduct/)。

文档中的“实现”“构建”“运行”“验收”表示不同层级。单元测试、源码覆盖记录或某个宿主的结果不能替代其他平台的验收；未知项以待核验标注。
