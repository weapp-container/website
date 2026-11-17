---
id: "docs/engineering/weapp-container/index"
title: "weapp-container"
section: "Project and maintenance"
summary: "weapp-container. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "908b8e74b41345487a5d847681d231ace0b2cde8"
sourcePath: "README.en.md"
---

# weapp-container

[简体中文](/docs/engineering/weapp-container/index/) · **English**

An independent open-source portable runtime for loading mini-program-shaped pages, components, scripts, and styles in a controlled process. The repository contains a manifest packer, Rust runtime, QuickJS/V8 engines, a simulator, and Node test bindings.

This project has no affiliation, authorization, or commercial relationship with any third-party platform, brand, service, or SDK. The repository provides only a portable runtime, manifest format, and compatibility identifiers. It contains no official tools, native platform SDKs, account system, or external-service bridge; callers own any external permissions and network behavior.

## Quick start

```sh
pnpm install
pnpm container:manifest:test
pnpm conformance:verify
pnpm api:inventory:verify
```

The Node bindings consume source directories or prebuilt portable packs. Callers choose and manage any compiler, host service, or external network integration themselves.

## License

Apache-2.0. See [NOTICE](https://github.com/weapp-container/weapp-container/blob/908b8e74b41345487a5d847681d231ace0b2cde8/NOTICE) and [SECURITY.md](/docs/engineering/weapp-container/security/).
