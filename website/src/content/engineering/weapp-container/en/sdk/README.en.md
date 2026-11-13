---
id: "docs/engineering/weapp-container/sdk/index"
title: "SDK integration"
section: "Project and maintenance"
summary: "SDK integration. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/sdk/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df94e03e3bfd506719d6849f45bbb078f3b4f974"
sourcePath: "sdk/README.en.md"
---

<a id="sdk-集成"></a>
# SDK integration

[简体中文](/docs/engineering/weapp-container/sdk/index/) · **English**


The six SDK source repositories are pinned Git submodules: `contract`, `android`, `ios`, `desktop`, `flutter` and `react-native`. All remain private during the preview.2 migration.

See [repository boundaries and binary installation](/en/docs/engineering/weapp-container/docs/sdk-repositories/) and each submodule README for independent builds. Runtime and C ABI implementation remain in the proprietary core. Wrapper source is Apache-2.0; distributed runtime binaries have a separate proprietary license and third-party notices.

Core scripts in `scripts/sdk-*` orchestrate binary production and standalone wrapper packaging. `sdk/build` and `sdk/licenses` are private build inputs, not exported implementation.

The original integration documentation is retained byte-for-byte in [docs/history/sdk-pre-split](/en/docs/engineering/weapp-container/docs/archived-evidence/). Its historical validation claims do not validate new revisions.
