---
id: "docs/engineering/website/hosts/harmony/index"
title: "Harmony showcase"
section: "Project and maintenance"
summary: "Harmony showcase. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/hosts/harmony/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "269411e03828e9d77714eb9c6aec87dbadd35e2d"
sourcePath: "hosts/harmony/README.en.md"
---

<a id="和谐展示"></a>
# Harmony showcase

[简体中文](/docs/engineering/website/hosts/harmony/index/) · **English**


ArkUI owns the native surface, lifecycle, input dialog and local preferences. The shared portable pack owns the demo pages. No Rust or C++ engine implementation is copied into this project.

Install `harmony` using `tools/sdk-install.mjs`, then run `node tools/native-harmony-build.mjs` from the repository root. The private SDK must contain `libs/arm64-v8a/libentry.so` and `libcontainer_host_harmony.so`, bound to the current restricted policy. The build verifies that both libraries remain byte-identical inside the unsigned HAP.

The official DevEco toolchain is required. Device installation and signing are separate from compilation. `entry/src/main/cpp/types/libentry` contains only public N-API declarations. Production engine implementation stays in the private SDK release.
