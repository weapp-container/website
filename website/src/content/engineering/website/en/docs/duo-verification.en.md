---
id: "docs/engineering/website/docs/duo-verification"
title: "Duo Historical Acceptance Summary"
section: "Runtime and hosts"
summary: "Duo Historical Acceptance Summary. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/docs/duo-verification/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "2a14c0761dcb531666b1ca0085488a8542c54206"
sourcePath: "docs/duo-verification.en.md"
---

<a id="duo-历史验收摘要"></a>
# Duo Historical Acceptance Summary

[简体中文](/docs/engineering/website/docs/duo-verification/) · **English**


candidate9 on 2026-11-06 includes web and partial Apple emulator verification. Complete raw logs, failed attempts, screenshots and deployment receipts are located in [Private Archives](/en/docs/engineering/website/docs/archived-evidence/). They were not re-implemented during open source cleanup and do not represent the current source code or approval for all platforms.

History packRoot is `f64a47603622916e27a1bf9cbb3778b6ec3498d62c720f4d8fc52cb18807e5b5`, policySha256 is `3c3b0ff8a5011a694acdb933624bdc8101e032670976416b8150e6fe12b3d1a0`. The original version and hash of the respective SDK bindings will continue to be subject to [SDK lock](https://github.com/weapp-container/website/blob/2a14c0761dcb531666b1ca0085488a8542c54206/platforms/sdk-artifacts.lock.json), [pack catalog](https://github.com/weapp-container/website/blob/2a14c0761dcb531666b1ca0085488a8542c54206/platforms/miniapp-artifacts.catalog.json), and the license of the old release will not be modified.

Web device presets, native emulators, and real hardware are different validation scopes. Real Apple devices, signatures, HarmonyOS installations, and undocumented business paths must still be independently verified. For the historical scope of subsequent full-screen work, see [Full-screen Summary](/en/docs/engineering/website/docs/duo-fullscreen-verification/).
