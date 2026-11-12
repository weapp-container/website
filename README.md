# Weapp Container Website

Source for [container.weapp.dev](https://container.weapp.dev), renamed from `weapp-container/showcase` to `weapp-container/website`. The website includes developer documentation and a fixed browser demonstration. Native host apps, runtime downloads and build evidence are managed as separate artifacts.

This repository contains a shared, locally simulated mini-program, an Astro/React website, and native consumers for seven hosts. It does not contain the core runtime source implementation. The browser runs a real Dedicated Worker with QuickJS/WASM and a CanvasKit presenter.

## Development

Use Node 24.18+ and the pinned pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm runtime:public
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm dev
```

`runtime:public` reproduces the already public fixed demo from versioned config and inventory snapshots, with exact file sizes and SHA-256 hashes. It needs no GitHub token or private build receipts. Verified caches work offline; missing or modified files fail closed. The immutable runtime URL must remain hosted; new demo generations require a reviewed lock and snapshot update. Native builds and producing a new demo use the separate explicit artifact workflows in `docs/`.

The complete previous repository, Releases, PR history and Actions remain in the private `weapp-container/website-private-archive`. This source repository has a separate identity and reviewed main history. Updated download tools resolve frozen legacy releases to that private archive. Old clients must upgrade; historical permissions and license terms still apply.

## Demonstrations

- Fundamentals: interactions, lists, components, scrolling, images, host information and state.
- Shop: Chinese search, categories, variants, cart, address editing, simulated payment and orders.
- Ordering: menu, variants, quantities, notes and simulated preparation/completion.

All orders and payments are simulated. State is stored in the current browser or native app private storage. Text fields use real host-native editing through the [shared message protocol](miniapp/BRIDGE.md). See [platform builds](docs/platforms.md) for native commands and actual target requirements.

## Distribution boundary

The dedicated `restricted-showcase` runtime compiles its pack roots and API ceiling into the binary. A valid but unauthorized pack is rejected before engine startup. Network, devices, real login/payment, canvas APIs, inspection and development update paths are unavailable. The normal runtime and SDK remain separate products.

Guest JS is transformed before packing. Release loaders are minified, source maps are omitted, Android uses R8 and Flutter release builds use obfuscation with private symbol files. These measures raise analysis cost; client binaries are not irreversible encryption.

Never publish a raw core producer directory: it may include private source snapshots. `tools/stage-web-runtime.mjs` verifies a pinned delivery receipt, applies the reviewed browser transforms and emits a final deployment inventory. `pnpm build` refuses private source/symbol files, unreviewed runtime bytes, missing assets and files over the hosting limit.

## Deployment

`wrangler.jsonc` deploys Workers Static Assets to `container.weapp.dev`. A staging Worker is available through `pnpm exec wrangler deploy --env staging`. Deploy a verified candidate with `pnpm deploy`; then run the browser smoke against the live URL. Keep the deployment receipt and previous Worker version for rollback. The [deployment guide](docs/deployment.md) records candidate verification, live acceptance, snapshots and rollback commands. No download token is included in the public site.

## License

Repository-authored source uses Apache-2.0; see LICENSE and NOTICE. The core and SDK source repositories also provide their own licenses. Previously published runtime archives keep the license and third-party notices shipped with each exact archive; source licenses do not replace those terms. The currently pinned public demo includes a Noncommercial Runtime License and is not an Apache-licensed runtime binary distribution. Repository access, artifact availability, and permission to redistribute remain separate questions. See [license and release boundaries](website/src/pages/docs/licensing.astro).

Demo image attribution and source URLs are recorded in `miniapp/assets/SOURCES.json`; photography follows the Unsplash License. Product names, prices and orders are fictional demo data.
