---
id: "docs/engineering/sdk-android/examples/host-services/index"
title: "Android Host Service Guides"
section: "Examples"
summary: "Android Host Service Guides. Versioned engineering reference from weapp-container/sdk-android."
route: "/docs/engineering/sdk-android/examples/host-services/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-android"
sourceCommit: "78377d5bcb1b5ff52c01769022cc3337437ae032"
sourcePath: "examples/host-services/README.en.md"
---

# Android Host Service Guides

[简体中文](/docs/engineering/sdk-android/examples/host-services/index/) · **English**

This directory collects integration guidance for native Android device capabilities. Host services are opt-in. Before integrating them, read the [host capability overview](/en/docs/engineering/sdk-android/host-services/) and confirm ownership of trusted host context, the permission broker and the session lifecycle.

| Guide | Coverage |
| --- | --- |
| [Wi-Fi API](/en/docs/engineering/sdk-android/examples/host-services/wifi-apis/) | Supported methods, system permissions, connection confirmation and network-routing boundaries |
| [NFC API](/en/docs/engineering/sdk-android/examples/host-services/nfc-apis/) | Tag technology objects, native I/O, cancellation and resource-cleanup boundaries |

Start with the implementation sources for [AndroidWifiApis.kt](https://github.com/weapp-container/sdk-android/blob/78377d5bcb1b5ff52c01769022cc3337437ae032/library/src/main/java/com/sonofmagic/weapp/container/sdk/AndroidWifiApis.kt) and [AndroidNfcTerminal.kt](https://github.com/weapp-container/sdk-android/blob/78377d5bcb1b5ff52c01769022cc3337437ae032/library/src/main/java/com/sonofmagic/weapp/container/sdk/AndroidNfcTerminal.kt). They describe the SDK's internal adapters and do not replace the host application's own permission handling, lifecycle management or target-device acceptance.
