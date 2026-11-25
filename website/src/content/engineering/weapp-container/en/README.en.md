---
id: "docs/engineering/weapp-container/index"
title: "Weapp Container"
section: "Project and maintenance"
summary: "Weapp Container. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "ee009375e8c26d14f66a6799d4dca992d28c3e85"
sourcePath: "README.en.md"
---

# Weapp Container

[简体中文](/docs/engineering/weapp-container/index/) · **English**

An independent open-source portable runtime for loading mini-program-shaped pages, components, scripts, and styles in a controlled process. It also accepts unpacked, unencrypted mini-game output through a schema-v4 manifest, with a Canvas 2D subset and host-delivered platform-neutral game events. The repository contains a manifest packer, Rust runtime, QuickJS/V8 engines, a simulator, and Node test bindings.

This project has no affiliation, authorization, or commercial relationship with any third-party platform, brand, service, or SDK. The repository provides only a portable runtime, manifest format, and compatibility identifiers. It contains no official tools, native platform SDKs, account system, or external-service bridge; callers own any external permissions and network behavior.

## Quick start

```sh
pnpm install
pnpm container:manifest:test
pnpm conformance:verify
pnpm api:inventory:verify
```

The Node bindings consume source directories or prebuilt portable packs. Callers choose and manage any compiler, host service, or external network integration themselves.

## Native SDK Examples and Release Status

Reference consumers for Android, iOS, React Native, Flutter, and Desktop live in the `sdk/` submodules. They cover pack loading, sessions, views, messages, navigation, storage, and lifecycle ownership. Public registries currently provide the `0.1.0-preview.7.1` prerelease, and no stable version is available. See the [SDK release status](/en/docs/engineering/weapp-container/docs/public-sdk-release/), [source build guide](/en/docs/engineering/weapp-container/docs/sdk-source-build/), and each SDK README for installation status, limitations, and runnable examples.

- [Android example app](/en/docs/engineering/sdk-android/consumer/index/)
- [iOS UIKit example app](/en/docs/engineering/sdk-ios/examples/consumer/index/)
- [React Native example app](/en/docs/engineering/sdk-react-native/example/index/)
- [Flutter example app](/en/docs/engineering/sdk-flutter/example/index/)
- [Desktop consumer example](/en/docs/engineering/sdk-desktop/consumer/index/)
- [Contract C ABI host example](/en/docs/engineering/sdk-contract/examples/consumer/index/)

## DevTools preview

The desktop DevTools packages include pinned Node.js, weapp-vite, the manifest packer and the simulator. After installation, choose a project directory. The launcher checks `project.config.json`, the source `app.json`, the compiler compatibility matrix and project dependencies before starting the Web Player or Desktop Player. The current production samples are `examples/apps/community/official-text`, `ant-design-button`, `taro-blended`, and `examples/apps/shop-demo`.

Each package includes `weapp-devtools.json` with source, compiler, Node, compatibility and file-hash metadata. Stable releases use a signed update manifest, Developer ID signing and notarization for macOS, and Authenticode signing for Windows MSI. The release workflow fails before publishing when stable signing inputs are missing. Preview releases do not participate in stable updates. Release signing, platform installation and official-tool evidence remain platform-specific and are not replaced by local headless checks.

## Mini-games

Pack and run an unpacked mini-game build with the QuickJS simulator:

```sh
pnpm container:pack -- ./game-dist --game --out ./artifacts/game
cargo run -p container-simulator --features quickjs-native -- \
  run --pack ./artifacts/game --snapshot ./artifacts/game/snapshot.json
```

This path requires `game.json` and `game.js`. It does not decrypt platform packages. The portable game runtime provides a Canvas 2D subset, frame scheduling, and normalized host events through `game.event` for touch, keyboard, sensor, audio interruption and memory warnings. App visibility uses `app.lifecycle`; viewport updates resize the game Canvas and notify `wx.onWindowResize`. Event payloads follow [`schemas/game-event-v1.schema.json`](https://github.com/weapp-container/weapp-container/blob/ee009375e8c26d14f66a6799d4dca992d28c3e85/schemas/game-event-v1.schema.json). API support remains capability-negotiated. Official DevTools, GPU and device parity remain unverified.

## Open-source mini-program examples

`examples/apps/community/` contains three curated runnable snapshots: a WeChat official text page, an Ant Design Mini button component, and a Taro blended-basic page. Each sample retains its upstream MIT license. Its directory guide and `SOURCES.json` record the repository, pinned commit, and local adaptations.

```sh
pnpm --dir vendor/weapp-vite exec wv build \
  "$PWD/examples/apps/community/official-text" -p weapp \
  --outDir "$PWD/artifacts/community/official-text/raw"
pnpm container:pack -- artifacts/community/official-text/raw \
  --out artifacts/community/official-text/pack \
  --compiler-commit "$(git -C vendor/weapp-vite rev-parse HEAD)"
pnpm simulator:dev:smoke -- \
  --project examples/apps/community/official-text
```

Replace `official-text` with `ant-design-button` or `taro-blended` for the other samples. See [`examples/apps/community/README.en.md`](https://github.com/weapp-container/weapp-container/blob/ee009375e8c26d14f66a6799d4dca992d28c3e85/examples/apps/community/README.en.md) for the complete sample list, commands, and source records.

To keep the simulator running in a browser:

```sh
cargo run -p container-simulator --features quickjs-native -- \
  dev --project examples/apps/community/official-text --surface web
```

## License

Apache-2.0. See [NOTICE](https://github.com/weapp-container/weapp-container/blob/ee009375e8c26d14f66a6799d4dca992d28c3e85/NOTICE) and [SECURITY](/en/docs/engineering/weapp-container/security/).
