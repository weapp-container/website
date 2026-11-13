---
id: "docs/engineering/weapp-container/sdk/index"
title: "SDK 集成"
section: "项目与维护"
summary: "SDK 集成。来自 weapp-container/weapp-container 的版本化工程说明。"
route: "/docs/engineering/weapp-container/sdk/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "5aac7236b56112dc0bde51f5e40f4ce519127fb6"
sourcePath: "sdk/README.md"
---

<a id="sdk-integration"></a>
# SDK 集成

**简体中文** · [English](/en/docs/engineering/weapp-container/sdk/index/)


六个 SDK 源代码仓库是固定的 Git 子模块：`contract`、`android`、`ios`、`desktop`、`flutter` 和 `react-native`。在预览版 2 迁移期间，所有仓库均保持私有。

见 [仓库边界和二进制安装](/docs/engineering/weapp-container/docs/sdk-repositories/) 及每个子模块的 README 文件，以实现独立构建。运行时和 C ABI 实现仍保留在专有核心中。包装器源代码采用 Apache-2.0 许可证；分发的运行时二进制文件具有独立的专有许可证和第三方声明。

`scripts/sdk-*` 目录中的核心脚本负责二进制文件的生成和独立包装器的打包。`sdk/build` 和 `sdk/licenses` 是私有构建输入，不对外导出实现。

原始集成文档在 [docs/history/sdk-pre-split](/docs/engineering/weapp-container/docs/archived-evidence/) 中完整保留。其历史验证声明不能验证新版本。
