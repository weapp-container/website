---
id: "docs/engineering/website/docs/deployment"
title: "Website builds, deployment, and rollback"
section: "Runtime and hosts"
summary: "Website builds, deployment, and rollback. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/docs/deployment/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "9280ea0ed20ae7123267b4008fb527a0f37948bc"
sourcePath: "docs/deployment.en.md"
---

<a id="网站构建部署与回滚"></a>
# Website builds, deployment, and rollback

[简体中文](/docs/engineering/website/docs/deployment/) · **English**

The site uses Cloudflare Workers Static Assets at `container.weapp.dev`. Deploy only `dist/`. Native applications, debug symbols, original build receipts, and historical private release attachments stay outside the public site.

<a id="从公开演示快照构建"></a>
## Build from the public demo snapshot

Use Node.js 24.18+ and the pinned pnpm version. Site development and public pull requests require no GitHub token:

```sh
pnpm install --frozen-lockfile
pnpm runtime:public
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm exec wrangler deploy --dry-run --env ''
```

`platforms/public-demo/` contains the versioned configuration and file inventory. Locks bind their exact bytes. Downloads use fixed paths on the same origin and verify each file's size and SHA-256; redirects and corrupt caches fail. Preserve all bundled licenses. This reproduces the existing fixed demo without generating a runtime or changing historical binary terms. Demo updates require reviewed configuration, inventory, and locks, with the fixed URLs remaining readable.

The `Website checks` workflow runs tests, builds, dry runs, and browser acceptance in the background. Deployment uses an explicit manual workflow entry. Cloudflare credentials come from the environment or CI secrets and are never stored in source or public assets.

<a id="新候选输入"></a>
## New candidate inputs

Build a new runtime from matching clean source and verify it independently. Start with the [core README](/en/docs/engineering/weapp-container/index/) and [platform tools](/en/docs/engineering/website/docs/platforms/). Historical candidates reside in `website-private-archive`; the public repository's default GitHub token cannot read them. Keep old tags and assets immutable. A new candidate needs a new version and matching pack, policy, license, and exact hashes.

`prepare-web.mjs` and explicit runtime install/stage workflows generate review inputs. `verify-site.mjs` checks the dependency closure, font coverage, pack blobs, file sizes, and public file boundary. Preserve photo attribution, font OFL, and full frontend third-party notices.

After changing Chinese text, regenerate the subset with the reviewed source font, `fonttools==4.60.1`, and `brotli==1.1.0`:

```sh
python tools/build-website-font.py /verified/NotoSansSC.ttf
```

<a id="发布与回滚"></a>
## Release and rollback

Record the previous Worker version and seal the static directory and file digests with `node tools/seal-web.mjs artifacts/web/snapshots`. Verify documentation, search, themes, desktop and mobile layouts, the actual Worker, session retirement, business flows, Chinese input, recovery, folding, and rotation in staging before production deployment.

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

Browser tests explicitly use `headless: true` and release their context and browser in `finally`. Clean up the preview process as well. Device presets, emulators, physical devices, and unit tests establish separate scopes. Repeated retries or a different smoke test cannot replace a failed check. See [demo performance methodology](/en/docs/engineering/website/docs/showcase-performance/).

The release receipt records the source commit, runtime directory hash, pack root, policy hash, deployment version, previous version, and acceptance report summary. Roll back to the preserved exact version, then repeat browser and HTTP acceptance:

```sh
pnpm exec wrangler rollback PREVIOUS_VERSION_ID --env '' --message '恢复上一版已验收网站' --yes
```

Historical deployment IDs, original samples, and receipts remain in the [private archive](/en/docs/engineering/website/docs/archived-evidence/). Update public platform status only from independent validation of the corresponding version.
