---
id: "docs/engineering/weapp-container/docs/licensing"
title: "许可说明"
section: "运行时与宿主"
summary: "许可说明。来自 weapp-container/weapp-container 的版本化工程说明。"
route: "/docs/engineering/weapp-container/docs/licensing/"
locale: "zh-CN"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "2c815f079426f3ff9910ed1433eb1f53b1961f3c"
sourcePath: "docs/licensing.md"
---

<a id="license-instructions"></a>
# 许可说明

**简体中文** · [English](/en/docs/engineering/weapp-container/docs/licensing/)


本次源码发行中，Weapp Container 自有的运行时、适配器、渲染器、构建工具和示例采用 [Apache License 2.0](https://github.com/weapp-container/weapp-container/blob/2c815f079426f3ff9910ed1433eb1f53b1961f3c/LICENSE)，允许按该许可使用、修改、商用和分发，没有额外非商业限制或商业授权要求。

`container-core`、`container-ir` 和 `container-bridge` 保留 `MIT OR Apache-2.0`。独立 SDK 采用随附的 Apache-2.0。第三方源码、字体、图片和依赖保留各自版权和许可；项目许可不替代这些条款。[NOTICE](https://github.com/weapp-container/weapp-container/blob/2c815f079426f3ff9910ed1433eb1f53b1961f3c/NOTICE)说明项目归属，`sdk/licenses` 保存依赖 notices。

<a id="build-and-distribute"></a>
## 构建和分发

原生构建将根目录 `LICENSE` 复制为 `RUNTIME-LICENSE`。产物须携带所选依赖图的完整 `licenses/` 清单、字体及平台声明。许可证收集器仅对明确声明 Apache-2.0 的 workspace 成员使用根目录 notices，不替未声明许可的本地依赖推定许可。

<a id="historical-copy"></a>
## 历史副本

此前分发的二进制、归档和 SDK 锁文件保持原始字节、哈希及随附许可。本次源码开放不重写其授权记录，也不证明旧副本与当前源码匹配。使用旧归档时查看该副本实际附带的许可证；本次开源版本需要从当前源码重新构建。

项目名称和品牌图形不授予商标权；第三方品牌归各自权利人所有。
