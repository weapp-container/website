---
id: "docs/engineering/weapp-container/examples/apps/player-chrome-app/index"
title: "Dev Player chrome fixture"
section: "Examples"
summary: "Dev Player chrome fixture. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/examples/apps/player-chrome-app/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df94e03e3bfd506719d6849f45bbb078f3b4f974"
sourcePath: "examples/apps/player-chrome-app/README.en.md"
---

<a id="dev-player-chrome-修复工具"></a>
# Dev Player chrome fixture

[简体中文](/docs/engineering/weapp-container/examples/apps/player-chrome-app/index/) · **English**


```sh
pnpm simulator:dev -- --project examples/apps/player-chrome-app --surface devices
```

Connect a preview.4 Player using the one-time device link. This app exercises
normal/custom navigation, dynamic title/color, host tabBar, capsule geometry,
page back, and persistent storage across capsule close/reopen.

Opening tools preserves the count; navigating back preserves the home count;
closing/reopening resets page memory but retains saved storage. Rotate and check
that reported capsule coordinates match the actual capsule in logical screen pixels.
The original WeChat output remains usable in official developer tools.
