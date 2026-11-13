---
id: "docs/engineering/weapp-container/index"
title: "Weapp Container"
section: "Project and maintenance"
summary: "Weapp Container. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df94e03e3bfd506719d6849f45bbb078f3b4f974"
sourcePath: "README.en.md"
---

<p align="center"><img src="/documentation/fc2a231269890624c732118d3939a56eae858cb7e435ecc1c224f8c62b07f8db.svg" width="96" height="96" alt="Weapp Container" /></p>

# Weapp Container

[简体中文](/docs/engineering/weapp-container/index/) · **English**


Embed mini-programs in your own applications. Weapp Container provides a Rust runtime, portable pack tooling, a development simulator, and integration layers for Android, iOS, C++ Desktop, Flutter, and React Native.

[Documentation](https://container.weapp.dev/en/docs/) · [Live demo](https://container.weapp.dev/en/demo/) · [Source documentation](/en/docs/engineering/weapp-container/docs/index/) · [Testing runtime](/en/docs/engineering/weapp-container/docs/testing-runtime/) · [Contributing](/en/docs/engineering/weapp-container/contributing/)

[GitHub prerelease downloads](https://github.com/weapp-container/weapp-container/releases)

[![Public source checks](https://github.com/weapp-container/weapp-container/actions/workflows/public-ci.yml/badge.svg)](https://github.com/weapp-container/weapp-container/actions/workflows/public-ci.yml)

Start with a native mini-program directory or an existing framework build. Integration does not require weapp-vite. The packer produces a verified manifest, IR, and content-addressed resources; the runtime manages JavaScript execution, pages, navigation, storage, and host messaging. QuickJS is the primary engine. V8, Skia, and browser presentation paths depend on the selected configuration and host capabilities.

The project is in **preview**. Source is public and can be built locally. Build, installation, runtime, and acceptance results are recorded separately for each platform; complete WeChat compatibility is not claimed. Read the [capability matrix](/en/docs/engineering/weapp-container/docs/capability-matrix/), [platform status](https://container.weapp.dev/en/docs/platforms/), and [validation methodology](/en/docs/engineering/weapp-container/docs/conformance/index/) before choosing a target.

Core runtime, iOS, Desktop and CocoaPods Specs downloads for `0.1.0-preview.7.0` are public. npm, Maven Central and pub.dev publication is incomplete; see the [release status](/en/docs/engineering/weapp-container/docs/public-sdk-release/) for installation commands, validation scope and blockers.

<a id="选择你的入口"></a>
## Choose a starting point

| Your goal | Start here |
| --- | --- |
| Try the runtime | [Fixed browser demo](https://container.weapp.dev/en/demo/); mini-program content is Chinese, and orders and payments are simulated |
| Embed a mini-program | [Quick start](https://container.weapp.dev/en/docs/start/) and [platform integrations](https://container.weapp.dev/en/docs/integrations/) |
| Package a native mini-program or existing build | [Portable packs](https://container.weapp.dev/en/docs/pack/) and the [standalone packer](/en/docs/engineering/weapp-container/tools/container-manifest/index/) |
| Modify the runtime or build a host | [Architecture](/en/docs/engineering/weapp-container/docs/architecture/), [SDK contracts](/en/docs/engineering/sdk-contract/index/), and the [engineering index](/en/docs/engineering/weapp-container/docs/index/) |
| Investigate compatibility | [API records](/en/docs/engineering/weapp-container/docs/api-runtime-conformance/), [host services](/en/docs/engineering/weapp-container/docs/host-services/index/), and [conformance](/en/docs/engineering/weapp-container/docs/conformance/index/) |

<a id="从源码开始"></a>
## Build from source

Install Git, Node.js **24.22.2 / 24.x**, pnpm **10.15.1**, Rust stable, and a host C/C++ toolchain. macOS requires Xcode Command Line Tools. The headless path below uses QuickJS and software rendering without building Skia. Visual previews and native SDKs also download public Skia dependencies; see [Rust build requirements](/en/docs/engineering/weapp-container/docs/rust-build-cache/).

```sh
git clone --recurse-submodules https://github.com/weapp-container/weapp-container.git
cd weapp-container
corepack enable
pnpm install --frozen-lockfile
pnpm submodule:verify
pnpm container:pack -- fixtures/reference-app --out artifacts/reference
cargo run --locked -p container-simulator --no-default-features --features quickjs-native -- run --pack artifacts/reference \
  --trace artifacts/simulator/trace.json \
  --snapshot artifacts/simulator/snapshot.json \
  --report artifacts/simulator/report.json
```

This path uses the repository's native mini-program fixture and builds the current runtime from source. It needs no historical runtime archive, download token, or weapp-vite installation. It produces a trace, state snapshot, and execution report. See the [simulator guide](/en/docs/engineering/weapp-container/docs/simulator/) for visual development previews.

<a id="可选使用-weapp-vite-开发示例"></a>
### Optional: develop the weapp-vite examples

Some development examples use the pinned upstream builder. Prepare it only when choosing those examples:

```sh
pnpm --dir vendor/weapp-vite install --frozen-lockfile
pnpm --dir vendor/weapp-vite build:pkgs
pnpm simulator:dev -- --project examples/apps/reference-app --surface web --software
```

The default address is `127.0.0.1:5179`. CanvasKit, browser Workers, desktop windows, and device debugging need additional setup described in the [simulator guide](/en/docs/engineering/weapp-container/docs/simulator/).

<a id="目录与接入"></a>
## Repository layout and integrations

| Location | Purpose |
| --- | --- |
| `tools/container-manifest`, `schemas` | Pack validation, manifests, content-addressed resources, and IR |
| `crates/container-runtime` | Sessions, lifecycle, navigation, host calls, and input state |
| `crates/container-engine-*` | QuickJS and explicit V8 provider boundaries |
| `crates/container-render-skia`, `container-host-*` | Rendering and Web/native host adapters |
| `crates/container-simulator`, `apps/dev-player` | Development simulator and device clients |
| `packages/node`, `packages/vitest`, `packages/runtime/*` | Node testing SDK, Vite/Vitest integration and prebuilt test hosts |
| `sdk/*` | Independent contracts and Android, iOS, Desktop, Flutter, and React Native wrappers |
| `website` | Documentation and demonstration website |
| `tools/runtime-artifacts` | [Runtime packaging, offline verification, and release tools](/en/docs/engineering/weapp-container/tools/runtime-artifacts/index/) |

The SDKs, website, and `vendor/weapp-vite` are pinned submodules. Commit changes in the owning repository before updating its pointer here. Historical prebuilt locks may still reference old releases; use the [SDK source build guide](/en/docs/engineering/weapp-container/docs/sdk-repositories/) for current integration.

<a id="检查"></a>
## Checks

```sh
pnpm opensource:check
pnpm docs:check
pnpm naming:check
pnpm naming:test
pnpm container:manifest:test
pnpm sdk:contracts:test
pnpm sdk:test
cargo fmt --all -- --check
cargo check --workspace --all-targets --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked -- --test-threads=1
```

Baseline PR checks use public dependencies. The full platform matrix, official development tools, devices, GPUs, and performance validation have explicit manual entry points. Unit tests do not establish real-device behavior or complete compatibility.

<a id="许可与历史"></a>
## License and history

Repository-authored source uses **Apache-2.0**. `container-core`, `container-ir`, and `container-bridge` retain **MIT OR Apache-2.0**; third-party components retain their own licenses. New builds include `RUNTIME-LICENSE` and dependency notices. See [licensing](/en/docs/engineering/weapp-container/docs/licensing/) and [NOTICE](https://github.com/weapp-container/weapp-container/blob/df94e03e3bfd506719d6849f45bbb078f3b4f974/NOTICE).

Public Git history starts from a prepared source snapshot. Earlier development history and large build records remain in private archives. Necessary regression fixtures stay in source; see [archived evidence](/en/docs/engineering/weapp-container/docs/archived-evidence/).

Historical runtime archives retain their shipped licenses and exact hashes, and some default download pins are currently unavailable. Source licensing does not relicense old binaries. Prefer [building matching source](/en/docs/engineering/weapp-container/docs/sdk-repositories/); historical downloader compatibility is described in the [migration guide](/en/docs/engineering/weapp-container/docs/runtime-artifacts-migration/).
