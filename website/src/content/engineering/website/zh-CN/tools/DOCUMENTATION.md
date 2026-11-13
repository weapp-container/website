---
id: "docs/engineering/website/tools/documentation"
title: "文档内容与双语网站维护"
section: "工具"
summary: "文档内容与双语网站维护。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/tools/documentation/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "2a14c0761dcb531666b1ca0085488a8542c54206"
sourcePath: "tools/DOCUMENTATION.md"
---

<a id="maintaining-documentation-and-the-bilingual-website"></a>
# 文档内容与双语网站维护

**简体中文** · [English](/en/docs/engineering/website/tools/documentation/)

接入指南的正文位于 `website/src/content/guides/`。工程文档只在所属公开仓库维护；网站保存固定提交的内容快照。默认中文网址不变，英文统一使用 `/en/`，不依据浏览器语言重定向。

<a id="edit-content-and-translations"></a>
## 修改正文与翻译

为每个自有 Markdown 保留 `.en.md` 配对、语言切换和旧标题锚点。两种语言共用 API 名称、参数、命令和代码示例。`documentation.json` 记录页面身份、分类、来源、中文摘要和复核哈希；修改中文后须复核英文，再运行 `tools/documentation/review.mjs`。检查器不会自动认可新哈希。

Astro 原生 Markdown collection 与共享页面模板负责渲染。`docs-pages.mjs` 提供接入导航元数据，`route-map.mjs` 校验页面 ID 的两种语言是否齐全。搜索索引按语言生成，包含正文、标题与 API 名称。

<a id="import-engineering-documentation"></a>
## 导入工程文档

先提交来源仓库的双语正文及清单，再在 website 根目录运行。`SOURCE_ROOT` 是公开核心仓库的 checkout，`ORGANIZATION_ROOT` 是组织 `.github` 的 checkout：

```sh
node tools/documentation-snapshot.mjs \
  --source-root SOURCE_ROOT --organization-root ORGANIZATION_ROOT
node tools/documentation-snapshot.mjs --check
```

导入器仅接纳来源清单中的文档与图片。原始清单、Markdown、来源提交、文件 SHA-256、派生内容哈希及资源清单随站点提交。文档链接映射到同语言站内页面，源码链接固定到来源提交。校验会拒绝漏页、额外文件、修改后的原文、派生内容或图片；独立构建不需要父仓库、GitHub token 或私有归档。

网站自身的接入指南不再次导入工程快照。先提交 website 正文，再导入该提交并单独提交快照，避免提交身份自引用。不要手工编辑派生目录 `website/src/content/engineering/`。

<a id="api-data-and-code-examples"></a>
## API 数据与代码示例

原始 API 清单、默认能力和来源回执分别位于 `website/src/data/api-*.json`。翻译由 `api-translations.json` 的展示层映射提供，不改写原始状态。只有上游资料确实变化时，才重新同步 API 原始数据。

```sh
node tools/sync-api-doc-snapshot.mjs --source-root SOURCE_ROOT
node tools/generate-capability-guide.mjs
node tools/api-examples.mjs --source-root SOURCE_ROOT
node tools/verify-api-docs.mjs
node tools/generate-capability-guide.mjs --check
node tools/api-examples.mjs --check
```

默认能力生成器同时输出两种语言。115 项默认能力与 12 项平台覆盖缺口保持独立结论；默认值不代表宿主实现或验收。源码摘录保留原文件上下文、提交、行号及哈希，不把测试代码当作可独立运行的接入示例。

<a id="acceptance-and-fonts"></a>
## 验收与字体

```sh
pnpm docs:check
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm exec wrangler deploy --dry-run --env ''
node tools/docs-browser-smoke.mjs --url http://127.0.0.1:4325
node tools/http-smoke.mjs --url http://127.0.0.1:4325
```

HTTP 检查需要 Wrangler 预览以应用缓存与安全头。浏览器脚本后台运行并关闭自己创建的 context 和 browser，保存桌面、移动端、中英文、搜索、复制与主题证据。固定示例小程序内部仍使用中文。

所有翻译和快照就绪后，用经过 SHA-256 核验的 Noto Sans SC 完整字体运行 `tools/build-website-font.py`，并提交新子集、回执和样式。它只更新网站字体，不更新运行时字体。部署和回滚继续遵循[部署指南](/docs/engineering/website/docs/deployment/)；缺少 Actions 凭据时保留已验收候选，不绕过现有发布流程。
