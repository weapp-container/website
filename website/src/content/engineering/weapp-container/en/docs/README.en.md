---
id: "docs/engineering/weapp-container/docs/index"
title: "Documentation index"
section: "Runtime and hosts"
summary: "Documentation index. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/docs/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "3a7e41ea4af330084b9a8683040f0bb4e61f7833"
sourcePath: "docs/README.en.md"
---

<a id="文档索引"></a>
# Documentation index

[简体中文](/docs/engineering/weapp-container/docs/index/) · **English**


Start with the [quick start](https://container.weapp.dev/en/docs/start/) when integrating for the first time. This directory explains runtime implementation and engineering boundaries. The website publishes fixed snapshots of these engineering documents.

<a id="接入与开发"></a>
## Integration and development

- [Standalone packer](/en/docs/engineering/weapp-container/tools/container-manifest/index/): convert native mini-program directories or existing framework builds to portable packs.
- [SDK repositories and source builds](/en/docs/engineering/weapp-container/docs/sdk-repositories/): targets, runtimes, wrappers, and artifact licensing.
- [Simulator](/en/docs/engineering/weapp-container/docs/simulator/) and [device client](/en/docs/engineering/weapp-container/docs/dev-player/): development previews, input, device connections, and diagnostics.
- [Host services](/en/docs/engineering/weapp-container/docs/host-services/index/): capability negotiation, lifecycle, messaging, permissions, and validation.

<a id="实现与协议"></a>
## Implementation and protocols

- [Architecture](/en/docs/engineering/weapp-container/docs/architecture/), [AppService execution](/en/docs/engineering/weapp-container/docs/appservice-execution/), and [isolated View engine](/en/docs/engineering/weapp-container/docs/isolated-view-engine/).
- [Layout](/en/docs/engineering/weapp-container/docs/layout-flow/), [text](/en/docs/engineering/weapp-container/docs/typography/), [images](/en/docs/engineering/weapp-container/docs/images/), [scrolling](/en/docs/engineering/weapp-container/docs/scrolling/), [transforms](/en/docs/engineering/weapp-container/docs/transforms/), and [compositing](/en/docs/engineering/weapp-container/docs/compositing/).
- [Dual rendering](/en/docs/engineering/weapp-container/docs/dual-renderer/index/): browser DOM, Skia, presentation acknowledgments, and input ownership.
- [Renderer profiles](/en/docs/engineering/weapp-container/docs/renderer-profiles/), [resource storage](/en/docs/engineering/weapp-container/docs/render-resource-store/), and [performance](/en/docs/engineering/weapp-container/docs/performance/).

<a id="兼容性发行与协作"></a>
## Compatibility, releases, and collaboration

- [Capability matrix](/en/docs/engineering/weapp-container/docs/capability-matrix/), [API conformance](/en/docs/engineering/weapp-container/docs/api-runtime-conformance/), and [official-tool validation](/en/docs/engineering/weapp-container/docs/conformance/index/).
- [Build dependencies](/en/docs/engineering/weapp-container/docs/rust-build-cache/), [platform archives](/en/docs/engineering/weapp-container/docs/platform-runtime-artifacts/), and [release tooling](/en/docs/engineering/weapp-container/tools/runtime-artifacts/index/).
- [Licensing](/en/docs/engineering/weapp-container/docs/licensing/), [public source policy](/en/docs/engineering/weapp-container/docs/public-source-policy/), [archived evidence](/en/docs/engineering/weapp-container/docs/archived-evidence/), and [legacy archive migration](/en/docs/engineering/weapp-container/docs/runtime-artifacts-migration/).
- [Contributing](/en/docs/engineering/weapp-container/contributing/), [security reports](/en/docs/engineering/weapp-container/security/), and [code of conduct](/en/docs/engineering/weapp-container/code_of_conduct/).

Implementation, build, runtime, and acceptance describe different levels of evidence. Unit tests, source coverage records, or results from one host do not establish acceptance on other platforms. Unknown behavior remains explicitly unverified.
