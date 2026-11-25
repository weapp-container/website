---
id: "docs/engineering/sdk-react-native/open_source"
title: "Open-source runtime integration"
section: "Project and maintenance"
summary: "Open-source runtime integration. Versioned engineering reference from weapp-container/sdk-react-native."
route: "/docs/engineering/sdk-react-native/open_source/"
locale: "en"
sourceRepository: "weapp-container/sdk-react-native"
sourceCommit: "65d27dcce691a69342c4196f1c46c95dc8977a0f"
sourcePath: "OPEN_SOURCE.en.md"
---

<a id="开源运行时集成"></a>
# Open-source runtime integration

[简体中文](/docs/engineering/sdk-react-native/open_source/) · **English**


The current core runtime and SDK source are Apache-2.0, with separately identified
components retaining their licenses. See the [core source build guide](https://github.com/weapp-container/weapp-container/blob/75e06c2b571d0507d334902ba1148eb3ca71d91c/docs/sdk-repositories.en.md).

This repository's existing runtime lock describes previously built archives. Its
versions, sizes, hashes, distribution profiles and download authorization remain
unchanged. A current source checkout is not evidence that those binaries were
rebuilt. A new open-source binary release requires independent build, packaging
and platform validation. Use the SDK's explicit local runtime/SDK input options
with a matching source build; no private artifact is needed for source tests.

Keep C ABI 1, existing public package names and negotiated capabilities. Keep
ORIGIN.json as historical provenance and refresh SOURCE-INVENTORY.json after
reviewing source changes where this repository supplies an inventory tool.
