---
id: "integrations/web"
title: "Web 在线演示"
section: "平台集成"
summary: "了解固定在线体验的运行范围及通用 Web SDK 的当前状态。"
route: "/docs/integrations/web/"
---

Web 演示

<a id="web-online-presentation-boundary"></a>
# Web 在线演示边界

**简体中文** · [English](web.en.md)


在线演示用于检查网站托管的一个经审核、功能受限的 Web runtime 与固定示例 pack。

<a id="stack"></a>
<a id="the-actual-operation-content-of-the-website"></a>
## 网站实际运行内容

- Astro 生成公开静态页面，Workers Static Assets 托管经检查的 dist 闭包。
- 固定 Web 应用在 Dedicated Worker 中运行 QuickJS/WASM。
- 图形显示使用同源 CanvasKit 与小程序模板资产。
- Demo UI 控制设备视口，文字输入透过同源宿主消息桥接处理。
- 在线页面只服务固定、受限的演示包；它不是通用 Web SDK，也不提供访客任意加载 pack 的入口。

<a id="not-sdk"></a>
<a id="not-a-universal-web-sdk"></a>
## 并非通用 Web SDK

现有网页将已批准的示例 pack 和策略绑定于本地 deployment hash，只允许这组打包好的演示能力。网页没有公开任意小程序包的上传/执行入口、后端服务或 Web application SDK；不要把它嵌入商业应用并期待完整的微信 API、系统媒体、摄像头、账户或硬件支持。

页面的页面尺寸选择器、Worker 生命周期与互动 smoke 证明这份固定演示的范围，不证明任意浏览器、WebAssembly 引擎或业务网络请求已具有生产 SLA。

<a id="preview"></a>
<a id="local-preview"></a>
## 本机预览

在网站仓库构建演示时，使用精确 Web runtime lock、归档内许可和清单哈希验证：

```bash
pnpm install --frozen-lockfile
pnpm test
node tools/prepare-web.mjs
pnpm build
pnpm dev
```

构建不会从开发源码目录自动选择替代 runtime。缺少锁定归档或读取权限时会失败；线上只部署审核过的固定演示闭包。
