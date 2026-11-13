---
id: "integrations/web"
title: "Web demonstration"
section: "Platform integrations"
summary: "Understand the fixed browser demonstration and general Web SDK boundaries."
route: "/docs/integrations/web/"
locale: "en"
---

WEB DEMO

<a id="web-在线演示边界"></a>
# Web online presentation boundary

[简体中文](web.md) · **English**


Online demo of an audited, feature-limited web runtime with fixed example pack for checking out website hosting.

<a id="stack"></a>
<a id="网站实际运行内容"></a>
## The actual operation content of the website

- Astro generates public static pages and Workers Static Assets host checked dist closures.
- Fixed web app running QuickJS/WASM in Dedicated Worker.
- The graphic display uses the same origin CanvasKit and the mini-program template asset.
- Demo UI controls the device viewport, and text input is processed through the same-origin host message bridge.
- The online page only serves fixed and limited demo packages; it is not a universal Web SDK and does not provide an entrance for visitors to load packs arbitrarily.

<a id="not-sdk"></a>
<a id="并非通用-web-sdk"></a>
## Not a universal Web SDK

The existing web page binds the approved sample pack and policy to the local deployment hash, allowing only this set of packaged demo capabilities. The web page does not expose the upload/execution entrance of any mini-program package, backend services or Web application SDK; do not embed it into a commercial application and expect full WeChat API, system media, camera, account or hardware support.

Page Size Selector, Worker Lifecycle, and Interaction smoke demonstrates the scope of this canned demo and does not certify that any browser, WebAssembly engine, or business network request has a production SLA.

<a id="preview"></a>
<a id="本机预览"></a>
## Local preview

Use exact web runtime lock, in-archive permissions, and manifest hash verification when building the demo in the website repository:

```bash
pnpm install --frozen-lockfile
pnpm test
node tools/prepare-web.mjs
pnpm build
pnpm dev
```

The build does not automatically select an alternative runtime from the development source directory. Fails when locking the archive or lack of read permission; only audited fixed demo closures are deployed online.
