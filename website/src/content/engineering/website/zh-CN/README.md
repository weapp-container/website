---
id: "docs/engineering/website/index"
title: "Weapp 容器网站"
section: "项目与维护"
summary: "Weapp 容器网站。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "269411e03828e9d77714eb9c6aec87dbadd35e2d"
sourcePath: "README.md"
---

<a id="weapp-container-website"></a>
# Weapp 容器网站

**简体中文** · [English](/en/docs/engineering/website/index/)


[container.weapp.dev](https://container.weapp.dev) 的源码，包括开发文档、平台进展和固定浏览器演示。文档默认中文，英文入口为 [/en/](https://container.weapp.dev/)。

[开发文档](https://container.weapp.dev/docs/) · [在线体验](https://container.weapp.dev/demo/) · [核心源码](/docs/engineering/weapp-container/index/) · [部署说明](/docs/engineering/website/docs/deployment/)

网站使用 Astro 和 React。浏览器演示通过 Dedicated Worker 中的 QuickJS/WASM 执行小程序，再由 CanvasKit 呈现。原生宿主示例、通用运行时和 SDK 分别构建、验证与发行，不能仅凭浏览器演示推断原生平台的支持状态。

<a id="development"></a>
<a id="run-locally"></a>
## 本地运行

需要 Node.js **24.18+** 和 pnpm **10.15.1**：

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm runtime:public
pnpm dev
```

打开 `http://127.0.0.1:4325`。`runtime:public` 按固定配置、文件大小与 SHA-256 获取已经公开的演示，不需要 GitHub token 或私有构建回执。完整缓存可离线复用；缺失或被修改的文件会使准备失败。该命令不会生成新运行时或绕过完整性检查。

<a id="demonstrations"></a>
<a id="documentation-and-content"></a>
## 文档与内容

- 接入文档包括快速开始、portable pack、平台集成、SDK API、29 组小程序 API、组件与排障。
- 进阶文档收录架构、渲染、协议、工具、示例与验证说明，保留对应仓库及固定提交的来源信息。
- GitHub Markdown 是工程文档正文的来源；网站使用已提交的固定内容快照独立构建，不读取父目录中的任意文件。
- 修改技术行为时同步中英文说明和版本来源；API 名称、能力状态、源码许可与运行库发行许可分别维护。

<a id="distribution-boundary"></a>
<a id="checks"></a>
## 检查

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm exec wrangler deploy --dry-run --env ''
```

`build` 同时检查站点链接、文档来源、搜索索引、代码高亮、字体及静态资源。浏览器检查与线上 HTTP 验收见[部署说明](/docs/engineering/website/docs/deployment/)。

<a id="deployment"></a>
<a id="online-demo"></a>
## 在线演示

演示包含基础交互、商城与点单。示例小程序内部使用中文；站点、设备控制和演示说明支持中英文。商品、支付、订单和制作状态均为模拟数据，状态保存在当前浏览器或原生应用私有存储中。

输入通过[共享消息协议](/docs/engineering/website/miniapp/bridge/)桥接到宿主原生编辑控件。原生构建命令和实际状态见[平台说明](/docs/engineering/website/docs/platforms/)。HarmonyOS 是已有示例，不代表另有通用公开 SDK。

固定演示使用 `restricted-showcase` 运行库，包根与能力上限编译进二进制，不提供通用网络、设备、真实登录／支付或开发更新能力。通用运行时与 SDK 的源码接入请从[核心仓库](/docs/engineering/weapp-container/index/)开始。

<a id="license"></a>
<a id="deploy-and-roll-back"></a>
## 部署与回滚

Workers Static Assets 部署到 `container.weapp.dev`，预览环境为 `staging.container.weapp.dev`。先验收候选，再部署并执行线上浏览器／HTTP 检查，保留部署回执、静态快照及上一 Worker 版本。步骤与回滚命令见[部署指南](/docs/engineering/website/docs/deployment/)。

GitHub 手动部署需要 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`，只通过受保护的环境或 Actions secrets 提供。源构建目录和含私有符号的产物不能直接部署；使用已核验的 staging 工具和最终资源清单。

<a id="license-and-historical-releases"></a>
## 许可与历史发行

自有源码采用 Apache-2.0，见 [LICENSE](https://github.com/weapp-container/website/blob/269411e03828e9d77714eb9c6aec87dbadd35e2d/LICENSE) 与 [NOTICE](https://github.com/weapp-container/website/blob/269411e03828e9d77714eb9c6aec87dbadd35e2d/NOTICE)。核心和 SDK 源码有各自许可。当前固定公开演示携带 Noncommercial Runtime License，其二进制不因网站源码开源而变为 Apache-2.0 发行物。

历史 Release 保留原版本、哈希与随附条款，并存储于私有归档；更新后的下载工具精确映射冻结的旧版本。源码访问、归档下载与再分发授权分别判断，见[平台说明](/docs/engineering/website/docs/platforms/)。

图片来源记录在 `miniapp/assets/SOURCES.json`，摄影资源遵循 Unsplash License。品牌、价格与订单为虚构演示数据。
