---
id: "docs/engineering/weapp-container/docs/conformance/index"
title: "Conformance Verification"
section: "Validation and compatibility"
summary: "Conformance Verification. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/docs/conformance/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "ee799c6df3c10e0c52b6e2c09a7632720e3d65c5"
sourcePath: "docs/conformance/README.en.md"
---

<a id="兼容验证"></a>
# Conformance Verification

[简体中文](/docs/engineering/weapp-container/docs/conformance/index/) · **English**


The WeApp Container verifies compatibility through observed, fixed-version tool behavior. Tests are not based on private implementation source code.

Baseline reference: [baseline-v1.json](https://github.com/weapp-container/weapp-container/blob/ee799c6df3c10e0c52b6e2c09a7632720e3d65c5/docs/conformance/baseline-v1.json), Use case index: [case-index-v1.json](https://github.com/weapp-container/weapp-container/blob/ee799c6df3c10e0c52b6e2c09a7632720e3d65c5/docs/conformance/case-index-v1.json).

<a id="验证层级"></a>
## Verification Levels

- Unit tests verify manifest, IR, runtime, and evidence handling protocols.
- Headless regression verifies the selected runtime path; it does not replace the official developer tool.
- Official observations are tied to actual tool versions, compiler commits, execution inputs, execution reports, and evidence hashes.
- Platform, GPU, device, and performance results are independent and not derived from other levels.

In the index, the statuses `unknown`, `blocked`, `failed`, and `passed` retain their original meanings. Missing evidence, unexecuted platforms, and incomplete diff reports do not constitute a release pass. Historical use cases and original reports are preserved in private archives; refer to [Historical Evidence Guidelines](/en/docs/engineering/weapp-container/docs/archived-evidence/). The current public snapshot does not include a full WeChat compatibility declaration.

<a id="常用入口"></a>
## Common Entry Points

Evidence handling tests also use fixed upstream repositories with Vitest / IDE CLI. First, prepare public source dependencies:

```sh
pnpm --dir vendor/weapp-vite install --frozen-lockfile
pnpm --dir vendor/weapp-vite --filter weapp-ide-cli... build
pnpm conformance:index
pnpm conformance:verify
pnpm conformance:evidence:test
pnpm mpcore:conformance:run
```

`conformance:verify`: Validate the golden outputs that have been committed. After modifying the index, differences must be reviewed and approved before submission.
Official tool execution uses `pnpm conformance:official`, requiring actual installed tool versions and resource availability as specified in the script. A complete `near-parity:gates` will fail if conditions are not met and retains its report.

Compiler build and producer version details are documented in [compiler-build.md](/en/docs/engineering/weapp-container/docs/conformance/compiler-build/) and [reviewed-producer-revisions.md](/en/docs/engineering/weapp-container/docs/conformance/reviewed-producer-revisions/). Any new public conclusions must record source code, tool version, input, output, execution method, and remaining constraints.
