---
id: "docs/engineering/sdk-flutter/weapp_container_platform_interface/index"
title: "Weapp Container platform interface"
section: "SDK engineering"
summary: "Weapp Container platform interface. Versioned engineering reference from weapp-container/sdk-flutter."
route: "/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "36cb4dd8c2dbeb9dd17549fc4c32e1d563693cb9"
sourcePath: "weapp_container_platform_interface/README.en.md"
---

<a id="小程序容器平台接口"></a>
# Weapp Container platform interface

[简体中文](/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/) · **English**

The main branch prepares the preview.7 public release. Use public installation only after the version appears in its registry; see the [SDK home](/en/docs/engineering/sdk-flutter/index/) for installation, requirements, and status. The source instructions below use preview.7. Build the exact checkout linked on the SDK home with same-version runtimes. Old locks remain for historical compatibility; current preparation tools default to the versioned preview.7 public lock.


Internal injectable transport for the federated Flutter SDK. Application code
uses `weapp_container`. The method/event channels are documented by the shared
`FLUTTER_PROTOCOL.md`; this package owns the Dart runtime epoch and subscribes
before initialization. All implementations share JSON payloads and native SDK
error codes. No native pointers or raster bytes cross this interface.
