---
id: "docs/engineering/website/docs/duo-fullscreen-verification"
title: "Duo full-screen historical acceptance summary"
section: "Runtime and hosts"
summary: "Duo full-screen historical acceptance summary. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/docs/duo-fullscreen-verification/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "9280ea0ed20ae7123267b4008fb527a0f37948bc"
sourcePath: "docs/duo-fullscreen-verification.en.md"
---

<a id="duo-全屏历史验收摘要"></a>
# Duo full-screen historical acceptance summary

[简体中文](/docs/engineering/website/docs/duo-fullscreen-verification/) · **English**


candidate10 on 2026-11-06 covers Web full screen, safe zone, and partial Apple emulator scenarios; full process, failed attempts, raw JSON, screenshots, and private instrumentation are saved in [Private Archive](/en/docs/engineering/website/docs/archived-evidence/). This open source cleanup does not consider these old results as re-acceptance of the current source code.

The historical runtime library sourceCommit is `e2a091b1124104a8d300b82f92d5bb36f3082903`, packRoot is `a0f5c48698c911436ce64ef63622c01cce99dbd17bbaaba0f6b25a44de696aaf`, and policySha256 is `57651739c7f50cd8dd0ca7a18c30681077a0a02b04e7e7e668acad64fad18031`. Original web archive SHA-256 is `553bbcc1cc4919d60832929ce99a1c640af4ae0677e0693dd48d94016639b7df`. Old release assets, licenses and hashes are not reissued as new open source releases.

Historical native Swift/Flutter iOS validation includes read-only state identity, UIKit witness, and rendered frame comparison. Partial RTL/embedding is performed with a private test host; standalone Flutter widget embedding modifies Dart and cannot be scaled to production applications for full validation or arbitrary FlutterViewController embedding support. Early expired, LTR, or geometrically inconsistent samples are excluded from valid results and failed records remain in the private archive.

Web Device Scheduled Checks are not a substitute for an actual Apple device, signature, or other system verification. The current source code release must be rebuilt and the actual execution scope recorded; see [platforms](/en/docs/engineering/website/docs/platforms/) for the historical status of the platform.
