---
id: "integrations/harmony"
title: "HarmonyOS 示例"
section: "平台集成"
summary: "查看 ArkTS Showcase 示例与当前构建、安装和运行验证状态。"
route: "/docs/integrations/harmony/"
locale: "zh-CN"
---

鸿蒙系统 / ArkTS

<a id="harmonyos-example"></a>
# HarmonyOS 示例

**简体中文** · [English](harmony.en.md)


组织内仓库包含 ArkTS 原生 Showcase host 和预览发行构建脚本。目前没有独立公开 HarmonyOS SDK wrapper 文档，也不承诺 ArkTS consumer package 已以独立稳定 SDK 发布。

<a id="current-record-status"></a>
## 当前记录的状态

| 阶段 | 状态 |
| --- | --- |
| 构建 | passed |
| 安装 | not-run |
| 运行 | not-run |
| 签名 | unsigned |

**构建不是设备验证**

最终 ArkTS Release HAP 已构建并核对三个原生库；未进行设备安装运行。设备安装、启动、界面交互、GPU present 和发布签名当前均不能从 Release HAP 构建结果推出。

<a id="source"></a>
<a id="source-and-toolchain"></a>
## 源码和工具链

ArkTS app 源码位于公开 website 仓库的 `hosts/harmony/`，依赖 HarmonyOS SDK、Hvigor 和目标平台构建工具。独立 Native Showcase 构建脚本要求匹配的 runtime、固定 pack 和对应发行许可。新源码构建与历史预编译件的许可分别核验；准备完成后再进行本地签名与设备测试。

网页不提供 HAP 下载、HarmonyOS 原生 runtime package、设备支持矩阵或平台 API 清单。使用预编译件前核对其许可、目标 API 级别、架构和签名要求。

<a id="next"></a>
<a id="how-to-contribute-verifiable-status"></a>
## 如何贡献可验证状态

部署 ArkTS app 后记录 SDK / runtime archive pins、Hvigor/SDK 版本、设备型号与 API 级别、签名模式、启动/交互/关闭结果和原始执行 receipt。分别更新 build、install、runtime、signing，不把一个阶段标记外推到其它阶段。

[查看当前平台验证状态](/docs/platforms/)
