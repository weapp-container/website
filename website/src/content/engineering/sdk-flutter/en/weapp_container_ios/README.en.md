---
id: "docs/engineering/sdk-flutter/weapp_container_ios/index"
title: "Weapp Container iOS implementation"
section: "SDK engineering"
summary: "Weapp Container iOS implementation. Versioned engineering reference from weapp-container/sdk-flutter."
route: "/docs/engineering/sdk-flutter/weapp_container_ios/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "ebe436aa98628ceffcdaea0df7037b4f761b7ec7"
sourcePath: "weapp_container_ios/README.en.md"
---

<a id="weapp-容器-ios-实现"></a>
# Weapp Container iOS implementation

[简体中文](/docs/engineering/sdk-flutter/weapp_container_ios/index/) · **English**

The main branch prepares the preview.7 public release. Use public installation only after the version appears in its registry; see the [SDK home](/en/docs/engineering/sdk-flutter/index/) for installation, requirements, and status. The source instructions below use preview.7. Build the exact checkout linked on the SDK home with same-version runtimes. Old locks remain for historical compatibility; current preparation tools default to the versioned preview.7 public lock.


Federated native plugin for `weapp_container`. Uses a UiKitView and the installed
Apple SDK wrapper plus its native universal XCFramework. The distribution builder
includes `ios/vendor/WeappContainer`. Minimum iOS is 16.0. No Cargo build occurs
in a consuming Flutter application.
