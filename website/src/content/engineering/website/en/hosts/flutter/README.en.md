---
id: "docs/engineering/website/hosts/flutter/index"
title: "Native showcase"
section: "Project and maintenance"
summary: "Native showcase. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/hosts/flutter/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "df46170e0d94fdcf52b0153f689870d34eaeb190"
sourcePath: "hosts/flutter/README.en.md"
---

<a id="原生展示"></a>
# Native showcase

[简体中文](/docs/engineering/website/hosts/flutter/index/) · **English**


One Flutter project targets Android, iOS, macOS, Windows and Linux. It embeds the
native QuickJS/Skia SDK. The host owns native text editing, durable demo state,
measured layout and awaited session close. Bridge messages follow
`miniapp/BRIDGE.md`; replies retain the guest session, page and request identities.

Install a matching restricted Flutter SDK distribution into `.runtime/sdk/flutter`,
then run `node tools/native-build.mjs --platform android`. The builder synchronizes
the shared `artifacts/miniapp/pack`; the app exposes no arbitrary pack loader.

Release Android uses an independent keystore and R8; Flutter release builds use
`--obfuscate` with private symbol output. iOS Simulator debug builds are separate
development checks. Apple device signing and macOS notarization require their
own configured identities.
