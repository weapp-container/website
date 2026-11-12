---
id: "docs/engineering/website/docs/deployment"
title: "网站构建、部署与回滚"
section: "运行时与宿主"
summary: "网站构建、部署与回滚。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/docs/deployment/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "43c9a0c31d57a75930742fe63c50e17045c3a206"
sourcePath: "docs/deployment.md"
---

<a id="website-builds-deployment-and-rollback"></a>
# 网站构建、部署与回滚

**简体中文** · [English](/en/docs/engineering/website/docs/deployment/)


官网使用 Cloudflare Workers Static Assets，生产域名为 `container.weapp.dev`。
仅 `dist/` 可以进入部署；原生应用、符号、原始构建收据和旧私有发行附件不进入站点。

<a id="build-from-the-public-demo-snapshot"></a>
## 从公开演示快照构建

使用 Node.js 24.18+ 和固定 pnpm。普通网站开发及公开 PR 不需要 GitHub token：

```sh
pnpm install --frozen-lockfile
pnpm runtime:public
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm exec wrangler deploy --dry-run --env ''
```

`platforms/public-demo/` 保存版本化配置与逐文件 inventory，锁文件绑定其字节。
下载只使用固定同源哈希路径，逐文件检查大小及 SHA-256；拒绝重定向和损坏缓存。
保留全部原许可。这只复现已有固定演示，不生成运行库，不改变旧专有二进制的许可。
更新演示须审核新的配置、inventory 和锁，并保持固定 URL 可读取。

`Website checks` 执行测试、构建、dry run 和后台浏览器验收；部署只由手动入口触发。
Cloudflare 账号及部署凭据通过环境或 CI secrets 提供，不保存到源码或网站。

<a id="new-candidate-inputs"></a>
## 新候选输入

新运行库须先从匹配的干净源码构建并完成独立验证。核心源码构建入口见
[核心 README](/docs/engineering/weapp-container/index/)，各端工具见
[platforms](/docs/engineering/website/docs/platforms/)。历史候选位于私有 `website-private-archive`，
新仓库的默认 GitHub token 没有其读取权限。旧发行只读，不能覆盖旧 tag 和资产；
新的候选使用新版本、匹配的 pack、策略、许可和精确哈希。

`prepare-web.mjs` 和显式的 runtime install/stage 工作流用于产生新的审核输入。
`verify-site.mjs` 检查依赖闭包、字体覆盖、pack blobs、文件大小与公开文件边界。
照片来源、字体 OFL 与完整前端第三方 notices 必须保留。

修改中文文案后，使用 `fonttools==4.60.1`、`brotli==1.1.0` 和审核字体执行：

```sh
python tools/build-website-font.py /verified/NotoSansSC.ttf
```

<a id="release-and-rollback"></a>
## 发布与回滚

部署者先记录前一 Worker 版本，并用 `node tools/seal-web.mjs artifacts/web/snapshots`
封存静态目录和逐文件摘要。staging 中独立验证文档搜索、深浅主题、桌面及移动布局、
真实 Worker、会话退休、业务流程、中文输入、恢复、折叠和旋转后才部署生产。

```sh
pnpm exec wrangler deploy --env staging
node tools/docs-browser-smoke.mjs --url https://staging.container.weapp.dev
node tools/browser-smoke.mjs --mode devices --url https://staging.container.weapp.dev
node tools/http-smoke.mjs --url https://staging.container.weapp.dev
pnpm exec wrangler deploy --env ''
node tools/docs-browser-smoke.mjs --url https://container.weapp.dev
node tools/browser-smoke.mjs --mode devices --url https://container.weapp.dev
node tools/http-smoke.mjs --url https://container.weapp.dev
```

测试显式使用 `headless: true`，在 finally 关闭本任务的 context/browser；预览进程也需收尾。
设备预设、模拟器、真机与单元测试分别记录范围。失败不能靠重复重试或业务 smoke 替代。
性能测量方法见 [H5 演示交互性能记录](/docs/engineering/website/docs/showcase-performance/)。

发布收据记录源码提交、运行库目录哈希、pack root、策略哈希、部署版本、上一版本与
验收报告摘要。回滚选取保存的精确版本，随后重新执行浏览器和 HTTP 验收：

```sh
pnpm exec wrangler rollback PREVIOUS_VERSION_ID --env '' --message '恢复上一版已验收网站' --yes
```

旧部署 ID、原始样本和回执保存在[私有档案](/docs/engineering/website/docs/archived-evidence/)。
公开页面的平台状态只依据对应版本的独立验证更新。
