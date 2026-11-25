---
id: "docs/engineering/sdk-desktop/open_source"
title: "Open-source runtime integration"
section: "Project and maintenance"
summary: "Open-source runtime integration. Versioned engineering reference from weapp-container/sdk-desktop."
route: "/docs/engineering/sdk-desktop/open_source/"
locale: "en"
sourceRepository: "weapp-container/sdk-desktop"
sourceCommit: "c04a228fa235fd9c010f4055de6a089233dc585c"
sourcePath: "OPEN_SOURCE.en.md"
---

<a id="开源运行时集成"></a>
# Open-source runtime integration

[简体中文](/docs/engineering/sdk-desktop/open_source/) · **English**


The current core runtime and SDK source are Apache-2.0, with separately identified
components retaining their licenses. See the [core source build guide](https://github.com/weapp-container/weapp-container/blob/ee009375e8c26d14f66a6799d4dca992d28c3e85/docs/sdk-repositories.en.md).

This repository's existing runtime lock describes previously built archives. Its
versions, sizes, hashes, distribution profiles and download authorization remain
unchanged. A current source checkout is not evidence that those binaries were
rebuilt. A new open-source binary release requires independent build, packaging
and platform validation. Use the SDK's explicit local runtime/SDK input options
with a matching source build; no private artifact is needed for source tests.

Keep C ABI 1, existing public package names and negotiated capabilities. Keep
ORIGIN.json as historical provenance and refresh SOURCE-INVENTORY.json after
reviewing source changes where this repository supplies an inventory tool.
