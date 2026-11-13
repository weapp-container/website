---
id: "docs/engineering/weapp-container/examples/apps/style-conditions-app/index"
title: "WXSS condition fixture"
section: "Examples"
summary: "WXSS condition fixture. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/examples/apps/style-conditions-app/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "5aac7236b56112dc0bde51f5e40f4ce519127fb6"
sourcePath: "examples/apps/style-conditions-app/README.en.md"
---

<a id="wxss-条件固定装置"></a>
# WXSS condition fixture

[简体中文](/docs/engineering/weapp-container/examples/apps/style-conditions-app/index/) · **English**


Run from the repository root:

```sh
cargo run -p container-simulator -- dev --project examples/apps/style-conditions-app --surface web --viewport 200x200
```

`srcMiniprogramRoot: "."` declares the App/Page sources, while
`miniprogramRoot: "dist/"` keeps compiler-owned output separate. Pointing both
at `.` lets the compiler's output cleanup remove its own input. This sample
uses the same pinned compiler and source/output boundary as the reference app;
it needs no subpackage or chunk changes. The dual-engine validation command
and compiler provenance requirements are in [the WXSS guide](/en/docs/engineering/weapp-container/docs/wxss-ir/#reproduce-the-native-sample).

The panel is red at 100×200, blue at 200×100, and green at 200×200. A conditional
local import colors the second square at widths of at least 150 logical pixels.
Tap the panel, then inspect: real Page data, selector geometry and lifecycle
observations are stored under `styles:observation`. Resize/re-render should
preserve the session and counter. `print` and unknown negated feature branches
must not override the panel. This fixture is a container regression; official
DevTools, GPU/device and performance acceptance are separate gates.
