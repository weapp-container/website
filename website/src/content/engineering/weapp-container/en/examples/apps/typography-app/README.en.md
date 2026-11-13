---
id: "docs/engineering/weapp-container/examples/apps/typography-app/index"
title: "Typography fixture"
section: "Examples"
summary: "Typography fixture. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/examples/apps/typography-app/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "c4c0bd1dc6754d5e9a8de354c5651e756d751e39"
sourcePath: "examples/apps/typography-app/README.en.md"
---

<a id="字体固定装置"></a>
# Typography fixture

[简体中文](/docs/engineering/weapp-container/examples/apps/typography-app/index/) · **English**


Run `pnpm simulator:dev -- --project examples/apps/typography-app --surface web`.
The two top labels inherit a numeric or percentage line height. “resize text”
changes the parent's font size through the actual Page handler; “inspect” stores
the committed selector results in `typography:observation`.

The fixture also includes explicit newlines, zero line height with visible ink,
and zero font size. `pnpm runtime:typography:smoke -- --simulator-bin …
--compiler-root … --compiler-dist-hashes … --out …` builds it with the pinned
compiler and compares native QuickJS/V8 runs. This is local runtime evidence;
official WeChat typography, full shaping, GPU and device parity remain separate
acceptance requirements.
