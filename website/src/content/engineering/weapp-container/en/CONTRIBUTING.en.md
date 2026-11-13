---
id: "docs/engineering/weapp-container/contributing"
title: "Contributing"
section: "Project and maintenance"
summary: "Contributing. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/contributing/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "5aac7236b56112dc0bde51f5e40f4ce519127fb6"
sourcePath: "CONTRIBUTING.en.md"
---

<a id="参与贡献"></a>
# Contributing

[简体中文](/docs/engineering/weapp-container/contributing/) · **English**


Please read the README in the root directory, the architecture, and the module documentation. Use Node.js 24.x, pnpm 10.15.1, and Rust stable, recursively initialize the fixed submodules, and run `pnpm install --frozen-lockfile`.

Create a short-lived feature or bug fix branch from `main`, for example `feat/<topic>` or `fix/<topic>`. PRs should describe the triggering mechanism, root cause, behavioral changes, and verification results. SDK modifications should first be submitted to a separate repository, then the main repository pointer should be updated. Do not submit cache files, signature materials, runtime archives, or device personal data.

Run the check commands described in README and regression tests for modified modules. Full Rust tests should use `-- --test-threads=1`; avoid time-limited engine tests that may contend for CPU. Official tools, devices, GPUs, and performance validation require additional environments; clearly specify the actual execution scope and reasons for unexecuted cases. Unit tests cannot serve as evidence of real device or full WeChat compatibility.

When fixing issues, first understand boundaries, data flows, and lifecycle. For reproducible behavior issues, supplement with meaningful regression tests. Any public CLI, C ABI, or SDK compatibility changes must be explicitly documented.

Contributions are governed by the license of the respective component, and third-party declarations are retained. Only content for which you have the right to distribute should be submitted. [Conduct Guidelines](/en/docs/engineering/weapp-container/code_of_conduct/) apply to collaboration. For security issues, report them privately via [SECURITY.md](/en/docs/engineering/weapp-container/security/).
