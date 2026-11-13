---
id: "docs/engineering/weapp-container/docs/clean-room-and-evidence"
title: "Clean-room and Evidence Recording"
section: "Validation and compatibility"
summary: "Clean-room and Evidence Recording. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/docs/clean-room-and-evidence/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df94e03e3bfd506719d6849f45bbb078f3b4f974"
sourcePath: "docs/clean-room-and-evidence.en.md"
---

<a id="clean-room-与证据记录"></a>
# Clean-room and Evidence Recording

[简体中文](/docs/engineering/weapp-container/docs/clean-room-and-evidence/) · **English**


Behavioral compatibility is achieved through version-fixed public interfaces, independent testing, and input-output comparison validation. Each record must include the method, tool version, input SHA-256, analysis timestamp, selected scope, conclusion, and limitations. The repository does not store official private source code, resources, user data, or binary files that could replace the official implementation.

Evidence does not prove that official package declarations are consistent with unpacked bytes. For modules with contradictory integrity assertions, insufficient coverage, or unobservable behavior, the record is marked as unknown/partial, and behavioral test coverage is used to supplement the contract.

All products use the Weapp Container name. The simulator CLI is designated as `weapp-simulator`. Product environment variables begin with `WEAPP_CONTAINER_`, and C ABI symbols begin with `weapp_container_`. `pnpm naming:check` validates public CLI, library name, package name, and C ABI declarations; `pnpm naming:test` enforces rejection behavior for missing, inconsistent, or incorrectly exported declarations.

The [public evidence index](https://github.com/weapp-container/weapp-container/blob/df94e03e3bfd506719d6849f45bbb078f3b4f974/docs/evidence-ledger.json) retains only distributable historical summaries. Complete original records are stored in the [private archive](/en/docs/engineering/weapp-container/docs/archived-evidence/). The public index is curated without modifying the original evidence bytes, nor does it upgrade historical results to current version acceptance conclusions. When input or original records are missing, the full evidence check continues to report conditions not met. Current container output uses `.weapp-container`.

`vendor/weapp-vite` remains a fixed commit clean checkout. For validation tasks requiring modifications to upstream E2E helper or project configuration, a task-specific temporary checkout must be created from the fixed SHA. The task executes and collects reports within this isolated checkout. Upon completion, the local patch, configuration, and original report are archived along with the source SHA, file list, and hashes; after verification, the temporary checkout is cleaned up according to ownership. Do not leave validation configurations or generated artifacts in fixed submodules. Do not treat archived local patches as verified or released upstream capabilities.
