---
id: "docs/engineering/weapp-container/docs/licensing"
title: "License instructions"
section: "Runtime and hosts"
summary: "License instructions. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/docs/licensing/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df94e03e3bfd506719d6849f45bbb078f3b4f974"
sourcePath: "docs/licensing.en.md"
---

<a id="许可说明"></a>
# License instructions

[简体中文](/docs/engineering/weapp-container/docs/licensing/) · **English**


In this source code release, Weapp Container’s own runtime, adapters, renderers, build tools and examples are licensed under [Apache License 2.0](https://github.com/weapp-container/weapp-container/blob/df94e03e3bfd506719d6849f45bbb078f3b4f974/LICENSE), which allows use, modification, commercial use and distribution under this license without additional non-commercial restrictions or commercial licensing requirements.

`container-core`, `container-ir`, and `container-bridge` reserve `MIT OR Apache-2.0`. The standalone SDK uses the included Apache-2.0. Third-party source code, fonts, images, and dependencies retain their respective copyrights and licenses; project licenses do not supersede these terms. [NOTICE](https://github.com/weapp-container/weapp-container/blob/df94e03e3bfd506719d6849f45bbb078f3b4f974/NOTICE) indicates project ownership, `sdk/licenses` saves dependency notices.

<a id="构建和分发"></a>
## Build and distribute

Native build copies root directory `LICENSE` to `RUNTIME-LICENSE`. Products must carry a complete `licenses/` manifest, fonts and platform declarations for the selected dependency graph. The license collector only uses root notices for workspace members that explicitly declare Apache-2.0 and does not presume permission for local dependencies that do not declare permission.

<a id="历史副本"></a>
## Historical Copy

Previously distributed binaries, archives, and SDK lock files retain the original bytes, hashes, and accompanying licenses. This source code opening does not rewrite its authorization records, nor does it prove that the old copy matches the current source code. When using an old archive, check the license that actually came with the copy; this open source version will need to be rebuilt from the current source code.

The project name and brand graphics do not grant trademark rights; third-party brands belong to their respective rights holders.
