---
id: "docs/engineering/sdk-flutter/weapp_container_platform_interface/index"
title: "Weapp Container platform interface"
section: "SDK engineering"
summary: "Weapp Container platform interface. Versioned engineering reference from weapp-container/sdk-flutter."
route: "/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "a6a649d86fbcd48a6b23d47870984e2829e35f3b"
sourcePath: "weapp_container_platform_interface/README.en.md"
---

<a id="小程序容器平台接口"></a>
# Weapp Container platform interface

[简体中文](/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/) · **English**


Internal injectable transport for the federated Flutter SDK. Application code
uses `weapp_container`. The method/event channels are documented by the shared
`FLUTTER_PROTOCOL.md`; this package owns the Dart runtime epoch and subscribes
before initialization. All implementations share JSON payloads and native SDK
error codes. No native pointers or raster bytes cross this interface.
