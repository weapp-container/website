---
id: "pack"
title: "配置与 portable pack"
section: "开始使用"
summary: "用独立工具打包原生小程序或已有框架产物，配置能力并校验资源。"
route: "/docs/pack/"
---

打包与配置

<a id="configuration-and-portable-pack"></a>
# 配置与 portable pack

**简体中文** · [English](pack.en.md)


portable pack 是交给 SDK 加载的小程序包。开发时保留原有工具，分发前把小程序产物转换成这个格式。

<a id="portable-pack"></a>
<a id="pack-contents"></a>
## 包里有什么

```text
hello-pack/
├── manifest.json
└── blobs/
    └── sha256/
        └── <内容哈希>
```

`manifest.json` 记录页面、入口、能力和内容根哈希，`blobs/` 保存代码、模板、样式与资源。把整个目录交给 SDK，不要只复制 manifest，也不要直接把开发服务器地址传给 `load`。

<a id="test-pack"></a>
<a id="try-a-ready-made-example-first"></a>
## 先试一个现成示例

[快速开始](/docs/start/#prepare-source)提供零 npm 依赖的测试包生成命令。只想验证宿主接入时，先使用这个包。

<a id="own-miniapp"></a>
<a id="package-existing-mini-programs"></a>
## 打包现有小程序

打包工具独立读取微信小程序目录，需要 `app.json`、页面和组件的 JS/WXML/WXSS 及其引用资源。原生小程序目录可直接输入；其它框架先用自己的构建命令产出这些文件。Weapp Container 接入不要求更换项目框架。

工具目前随[核心源码仓库](https://github.com/weapp-container/weapp-container/tree/main/tools/container-manifest)提供，尚无独立公开 npm 安装命令。在该仓库根目录执行：

```bash
pnpm install --frozen-lockfile
node tools/container-manifest/bin/container-pack.mjs \
  /absolute/path/weapp-output \
  --out /absolute/path/portable-pack
```

安装只需该仓库的工具依赖，无需初始化 `vendor/weapp-vite` 子模块。输入中若有 TypeScript 或框架专用语法，应先编译成小程序产物。具体模板、插件和 API 的兼容范围仍需按[组件兼容性](/docs/components/)与[API 记录](/docs/api/)验收。

命令会检查依赖闭包、转换模板和样式、生成内容哈希，并输出 `manifest.json`、`blobs/`、`capability-matrix.json` 和 `diagnostics.json`。先处理 diagnostics 中的错误，再将完整输出放进宿主资源目录。

为什么 v1 manifest 的 compiler.name 仍显示 weapp-vite？

这是 v1 schema 保留的历史格式标识，独立测试包也沿用它。它不要求业务使用对应构建框架。不要手改生成的身份字段，否则会破坏 schema 或内容哈希校验。

<a id="validation"></a>
<a id="verification-before-loading"></a>
## 加载前校验

- 检查清单中的格式版本和运行时/ABI 版本匹配。
- 重新计算 manifest 与 blob SHA-256，按锁定 pack root 比较完整性身份。
- 检查全部资源均在 pack 根目录，拒绝路径遍历、符号链接、未锁定的二进制和部分解压。
- 核对发行策略中允许的 pack root 与 capability ceiling。
- 对最终目录和其哈希锁分别留存来源与构建证据。

<a id="capabilities"></a>
<a id="capability-and-permission-negotiation"></a>
## 能力和权限协商

需要调整包声明的能力时，创建 JSON 文件，并把它传给打包命令的 `--capabilities` 参数。例如：

```json
{
  "wx.getStorage": "partial",
  "wx.request": "unsupported"
}
```
```bash
node tools/container-manifest/bin/container-pack.mjs \
  /absolute/path/weapp-output \
  --out /absolute/path/portable-pack \
  --capabilities /absolute/path/capabilities.json
```

文件只覆盖列出的能力，其余使用工具默认值。能力分为 `full`、`partial` 和 `unsupported`；包声明与宿主 provider 协商后的较低等级决定可调用范围，`wx.canIUse` 报告协商结果。声明能力不会自动提供系统权限或宿主实现。

<a id="full-vs-partial"></a>
<a id="full-and-partial-support"></a>
## 完整与部分支持

`partial` 表示 bridge contract 或部分行为存在，但参数语义、宿主差异、设备验证或微信对照证据仍有限。详见具体 API 组的 difference、coverage 和 conformance 字段。设备系统能力、登录、付款、网络与文件授权都需要宿主 provider 和应用权限流程。

<a id="private-demo"></a>
<a id="restricted-online-demo"></a>
## 受限在线演示

container.weapp.dev 发布的是固定 pack 和编译进运行时的 restricted-showcase 策略。网站只提供该演示的同源运行文件，不接受访客任意上传或指向自己服务器的应用包，也不下发运行库或 SDK 下载凭据。
