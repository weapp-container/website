---
id: "docs/engineering/website/docs/duo-verification"
title: "Duo 历史验收摘要"
section: "运行时与宿主"
summary: "Duo 历史验收摘要。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/docs/duo-verification/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "df46170e0d94fdcf52b0153f689870d34eaeb190"
sourcePath: "docs/duo-verification.md"
---

<a id="duo-historical-acceptance-summary"></a>
# Duo 历史验收摘要

**简体中文** · [English](/en/docs/engineering/website/docs/duo-verification/)


2026-11-06 的 candidate9 包含 Web 与部分 Apple 模拟器验证。完整原始记录、失败尝试、截图和部署回执位于[私有档案](/docs/engineering/website/docs/archived-evidence/)。它们未在开源整理期间重新执行，不代表当前源码或所有平台通过。

历史 packRoot 为 `f64a47603622916e27a1bf9cbb3778b6ec3498d62c720f4d8fc52cb18807e5b5`，policySha256 为 `3c3b0ff8a5011a694acdb933624bdc8101e032670976416b8150e6fe12b3d1a0`。SDK 各自绑定的原始版本和哈希继续以 [SDK lock](https://github.com/weapp-container/website/blob/df46170e0d94fdcf52b0153f689870d34eaeb190/platforms/sdk-artifacts.lock.json)、[pack catalog](https://github.com/weapp-container/website/blob/df46170e0d94fdcf52b0153f689870d34eaeb190/platforms/miniapp-artifacts.catalog.json) 为准，不修改旧发行物许可。

Web 设备预设、原生模拟器和真实硬件是不同的验证范围。Apple 真机、签名、HarmonyOS 安装以及未记录的业务路径仍须独立验证。后续全屏工作的历史范围见[全屏摘要](/docs/engineering/website/docs/duo-fullscreen-verification/)。
