---
id: "docs/engineering/website/miniapp/index"
title: "One pack, seven hosts"
section: "Project and maintenance"
summary: "One pack, seven hosts. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/miniapp/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "88b099619334a4fb751e7e9f089c6ee9d7ef60d5"
sourcePath: "miniapp/README.en.md"
---

<a id="一包七宿主"></a>
# One pack, seven hosts

[简体中文](/docs/engineering/website/miniapp/index/) · **English**


Native WXML/WXSS/CommonJS application for the Weapp Container showcase. The
single route has explorer, store, food ordering, product, bag, checkout, order
list, and order detail screens. The rendering surface follows actual host window dimensions. Local
`hostLayout` safe insets and active reserved regions protect content independently
of the background. The resolved physical bar edge enables side navigation;
otherwise the same business navigation uses top and bottom bars. The scroll area
and product/menu columns are recalculated without replacing the session. Images are bundled locally.

The source already uses native WeChat file format. Run the repository's
`tools/build-miniapp.mjs` with a reviewed private toolchain to transform JS and
pass the frozen native files to the formal `container-pack` tool. The builder
passes the project with `--project` so `container.config.json` declares Skia.
It records that no `weapp-vite` compiler was invoked; do not attribute compiler
execution or conformance to this native-source pack. Do not author a portable
manifest by hand. The website and every native host load the same verified bytes.

The sample uses no subpackages or custom chunk strategy. This small product
catalog benefits from one source and one shared state model. Container settings
stay outside standard `app.json`. No upstream compiler or runtime implementation
is copied into this repository.

See [BRIDGE.md](/en/docs/engineering/website/miniapp/bridge/) for host input, state persistence, lifecycle, and launch
query details. Orders and payments are entirely simulated. All demo identity
and address data are fictional; visitors should avoid entering real personal data.
