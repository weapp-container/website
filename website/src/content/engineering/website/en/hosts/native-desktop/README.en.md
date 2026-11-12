---
id: "docs/engineering/website/hosts/native-desktop/index"
title: "C++ native hosts"
section: "Project and maintenance"
summary: "C++ native hosts. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/hosts/native-desktop/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "9280ea0ed20ae7123267b4008fb527a0f37948bc"
sourcePath: "hosts/native-desktop/README.en.md"
---

<a id="c-原生宿主"></a>
# C++ native hosts

[简体中文](/docs/engineering/website/hosts/native-desktop/index/) · **English**


CMake consumes `WeappContainer::Desktop` from an exact installed SDK prefix.
macOS uses AppKit/Metal, Windows uses Win32/WGL and Linux uses GTK3/OpenGL.
Each UI retains its event loop until the SDK emits `Closed`; JSON demo state
and native text editing use the shared fenced bridge protocol.

Run `node tools/native-consumer-build.mjs --platform macos|windows|linux`.
The app receives the verified shared pack directory as its only CLI argument.
The runtime's compiled policy independently rejects arbitrary packs. Build/link,
GUI execution, actual GPU and operating system signing remain separate checks.

The nlohmann JSON header is MIT licensed. Its original version, source and byte
hash are retained in `third_party/nlohmann/SOURCE.json` with its license.
