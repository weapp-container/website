---
id: "docs/engineering/website/hosts/native-android/index"
title: "Kotlin host"
section: "Project and maintenance"
summary: "Kotlin host. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/hosts/native-android/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "2a14c0761dcb531666b1ca0085488a8542c54206"
sourcePath: "hosts/native-android/README.en.md"
---

<a id="kotlin-宿主"></a>
# Kotlin host

[简体中文](/docs/engineering/website/hosts/native-android/index/) · **English**


The application resolves only the verified Maven repository under
`.runtime/sdk/android/maven` and loads its bundled shared miniapp pack. It uses the
SDK View, measured Android layout, native EditText dialogs, bounded state
persistence and asynchronous close. No network or device permissions are added.

Run `node tools/native-consumer-build.mjs --platform android` after exact SDK
installation. Release builds require the same dedicated signing environment as
the Flutter showcase; debug signing never substitutes for it.
