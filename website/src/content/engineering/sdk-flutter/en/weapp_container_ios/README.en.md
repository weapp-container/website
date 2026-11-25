---
id: "docs/engineering/sdk-flutter/weapp_container_ios/index"
title: "Weapp Container iOS implementation"
section: "Project and maintenance"
summary: "Weapp Container iOS implementation. Versioned engineering reference from weapp-container/sdk-flutter."
route: "/docs/engineering/sdk-flutter/weapp_container_ios/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "ae47e1e4cf25d95a457ab5bcf4d2381d01b3785b"
sourcePath: "weapp_container_ios/README.en.md"
---

<a id="weapp-容器-ios-实现"></a>
# Weapp Container iOS implementation

[简体中文](/docs/engineering/sdk-flutter/weapp_container_ios/index/) · **English**

The main branch prepares the preview.7 public release. Use public installation only after the version appears in its registry; see the [SDK home](/en/docs/engineering/sdk-flutter/index/) for installation, requirements, and status. The source instructions below use preview.7. Build the exact checkout linked on the SDK home with same-version runtimes. Old locks remain for historical compatibility; current preparation tools default to the versioned preview.7 public lock.

Federated iOS plugin for `weapp_container`, using UiKitView and `WeappContainer` Pod `0.1.0-preview.7.1`. The standalone CocoaPods Trunk archive is not published. Download and verify the iOS SDK tarball from the core prerelease, then provide its `WeappContainer.podspec` by local path in the application Podfile. Minimum iOS is 16 and compilation requires Xcode 27.2+. The plugin contains its Swift bridge and the dependency Pod supplies the XCFramework.
