---
id: "平台"
title: "平台状态与支持边界"
section: "发行与支持"
summary: "按平台查看构建、安装、运行与签名状态。"
route: "/docs/platforms/"
---

平台状态

<a id="platform-status-and-support-boundaries"></a>
# 平台状态与支持边界

**简体中文** · [English](platforms.en.md)


构建、安装、运行和发布签名分别验证。这里只展示各自独立证据，不把一个阶段标记外推到另一阶段。

<a id="current-platform-matrix"></a>
## 当前平台矩阵

| 平台 | 架构 | 构建 | 安装 | 运行 | 签名 |
| --- | --- | --- | --- | --- | --- |
| [Web](/docs/integrations/web/) | WASM / Dedicated Worker | 已通过 | 不适用 | 已通过 | 不适用 |
| [Android](/docs/integrations/android/) | arm64-v8a / x86_64 | 已通过 | 模拟器已验证 | 模拟器已验证 | Release 签名已验证 |
| [iOS](/docs/integrations/ios/) | arm64 device / arm64 + x86_64 simulator | 已通过 | 模拟器已验证 | 模拟器已验证 | 模拟器构建未签名 |
| [HarmonyOS](/docs/integrations/harmony/) | arm64 | 已通过 | 未执行 | 未执行 | 待签名 |
| [macOS](/docs/integrations/desktop/) | arm64 / x86_64 | 已通过 | 本机已验证 | 桌面运行已验证 | 待签名 |
| [Windows](/docs/integrations/desktop/) | x86_64 | 待验证 | 未执行 | 未执行 | 待签名 |
| [Linux](/docs/integrations/desktop/) | x86_64 | 已通过 | runner bundle 已验证 | 部分通过 | 不适用 |

更新日期：2026-11-06。上表来源于仓库平台状态快照。示例代码支持情况以该快照 source commit 和各平台 receipt 为准。

<a id="limitations"></a>
<a id="known-limitations"></a>
## 重要限制

- **HarmonyOS：** ArkTS Release HAP 构建已记录；安装和设备运行尚未记录。
- **Windows：** Desktop SDK consumer 证据不代表原生 Showcase app 已完整通过。
- **Linux：** runner 启动和画面记录不代表所有商城、文本交互或 Flutter ABI 全通过。
- **iOS：** Simulator 和真机属于不同证据；缺少 Apple 分发签名的候选不能直接外推到正式分发。
- **移动端 ABI：**构建容器、模拟器和 arm64 真机执行需逐目标核验，不假设架构完全对称。

<a id="acceptance"></a>
<a id="validate-a-target"></a>
## 每个目标应该如何验收

取得相符 artifact pin 后，在被测目标验证 archive/path/hash，之后单独编译独立consumer。应用安装后检查 native graphics surface、有效首帧、点击/滚动、路由、后台暂停/恢复、storage flush/重开和显式关闭。签名、公证、系统权限与实际设备型号需要额外标记。任何“passed”都应关联运行时版本、pack root 和不可变 receipt。

[打开简版平台总览](/platforms/)
