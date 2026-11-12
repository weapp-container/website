---
id: "docs/engineering/website/index"
title: "Weapp Container Website"
section: "Project and maintenance"
summary: "Weapp Container Website. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "269411e03828e9d77714eb9c6aec87dbadd35e2d"
sourcePath: "README.en.md"
---

<a id="weapp-容器网站"></a>
# Weapp Container Website

[简体中文](/docs/engineering/website/index/) · **English**


Source for [container.weapp.dev](https://container.weapp.dev), including developer documentation, platform progress, and a fixed browser demo. Chinese is the default; English starts at [/en/](https://container.weapp.dev/en/).

[Documentation](https://container.weapp.dev/en/docs/) · [Live demo](https://container.weapp.dev/en/demo/) · [Core source](/en/docs/engineering/weapp-container/index/) · [Deployment](/en/docs/engineering/website/docs/deployment/)

The website uses Astro and React. The browser demo runs mini-program code with QuickJS/WASM in a Dedicated Worker and presents it with CanvasKit. Native examples, the general runtime, and SDKs have separate builds, validation, and releases. A browser demo does not establish support on native platforms.

<a id="development"></a>
<a id="本地运行"></a>
## Run locally

Install Node.js **24.18+** and pnpm **10.15.1**:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm runtime:public
pnpm dev
```

Open `http://127.0.0.1:4325`. `runtime:public` retrieves the already public demo using pinned configuration, exact file sizes, and SHA-256 hashes. It needs no GitHub token or private build receipt. Complete verified caches work offline; missing or modified files fail preparation. The command does not create a new runtime or bypass integrity checks.

<a id="demonstrations"></a>
<a id="文档与内容"></a>
## Documentation and content

- Integration guides cover the quick start, portable packs, platforms, SDK APIs, 29 mini-program API groups, components, and troubleshooting.
- Engineering references cover architecture, rendering, protocols, tools, examples, and validation, with their owning repositories and fixed source revisions.
- GitHub Markdown is the source of engineering documentation. The website builds independently from committed snapshots and does not read arbitrary parent directories.
- Technical changes require updates to both languages and source records. API names, capability status, source licensing, and runtime distribution terms remain separate concerns.

<a id="distribution-boundary"></a>
<a id="检查"></a>
## Checks

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm exec wrangler deploy --dry-run --env ''
```

`build` also validates links, documentation provenance, search indexes, syntax highlighting, fonts, and static assets. See [deployment](/en/docs/engineering/website/docs/deployment/) for browser checks and live HTTP acceptance.

<a id="deployment"></a>
<a id="在线演示"></a>
## Online demo

The demo includes fundamentals, shopping, and ordering. Mini-program content remains Chinese; the website, device controls, and surrounding instructions support Chinese and English. Products, payments, orders, and preparation states are simulated. State stays in the current browser or native application's private storage.

Text input uses host-native controls through the [shared message protocol](/en/docs/engineering/website/miniapp/bridge/). Build commands and actual target status are documented under [platforms](/en/docs/engineering/website/docs/platforms/). HarmonyOS refers to an existing example, rather than a separate general-purpose public SDK.

The fixed demo uses a `restricted-showcase` runtime with compiled pack roots and capability limits. It does not expose general networking, devices, real authentication/payment, or development updates. Start from the [core repository](/en/docs/engineering/weapp-container/index/) for the general runtime and SDK source integrations.

<a id="license"></a>
<a id="部署与回滚"></a>
## Deploy and roll back

Workers Static Assets serves `container.weapp.dev`, with staging at `staging.container.weapp.dev`. Validate a candidate before deployment, run live browser and HTTP checks afterward, and preserve the deployment receipt, static snapshot, and previous Worker version. See the [deployment guide](/en/docs/engineering/website/docs/deployment/) for commands and rollback.

Manual GitHub deployment requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, supplied only through protected environments or Actions secrets. Raw producer directories and private symbols must not be deployed; use the reviewed staging tools and final asset inventory.

<a id="许可与历史发行"></a>
## License and historical releases

Repository-authored source uses Apache-2.0; see [LICENSE](https://github.com/weapp-container/website/blob/269411e03828e9d77714eb9c6aec87dbadd35e2d/LICENSE) and [NOTICE](https://github.com/weapp-container/website/blob/269411e03828e9d77714eb9c6aec87dbadd35e2d/NOTICE). Core and SDK source have their own license records. The pinned public demo ships a Noncommercial Runtime License; publishing website source does not turn its binary into an Apache-2.0 distribution.

Historical releases retain their original versions, hashes, and shipped terms in private archives. Updated download tools resolve exact frozen legacy versions. Source access, archive download access, and redistribution rights must be evaluated separately; see [platforms](/en/docs/engineering/website/docs/platforms/).

Image sources are recorded in `miniapp/assets/SOURCES.json`; photography follows the Unsplash License. Brands, prices, and orders are fictional demo data.
