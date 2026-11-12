---
id: "docs/engineering/sdk-flutter/weapp_container_platform_interface/index"
title: "Weapp Container platform interface"
section: "SDK engineering"
summary: "Weapp Container platform interface. Versioned engineering reference from weapp-container/sdk-flutter."
route: "/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "84ae8c14ae14c8d2f6fe44abe4a514f8d3e6ff60"
sourcePath: "weapp_container_platform_interface/README.en.md"
---

<a id="小程序容器平台接口"></a>
# Weapp Container platform interface

[简体中文](/docs/engineering/sdk-flutter/weapp_container_platform_interface/index/) · **English**

The main branch prepares the preview.7 public release. Use public installation only after the version appears in its registry; see the [SDK home](/en/docs/engineering/sdk-flutter/index/) for installation, requirements, and status. The details below retain the pinned preview.6 source contract. Build that version from the exact checkout linked on the SDK home and do not mix it with preview.7 runtimes.


Internal injectable transport for the federated Flutter SDK. Application code
uses `weapp_container`. The method/event channels are documented by the shared
`FLUTTER_PROTOCOL.md`; this package owns the Dart runtime epoch and subscribes
before initialization. All implementations share JSON payloads and native SDK
error codes. No native pointers or raster bytes cross this interface.
