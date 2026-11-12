---
id: "docs/engineering/sdk-flutter/weapp_container_android/index"
title: "Weapp Container Android implementation"
section: "SDK engineering"
summary: "Weapp Container Android implementation. Versioned engineering reference from weapp-container/sdk-flutter."
route: "/docs/engineering/sdk-flutter/weapp_container_android/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "84ae8c14ae14c8d2f6fe44abe4a514f8d3e6ff60"
sourcePath: "weapp_container_android/README.en.md"
---

<a id="weapp-容器-android-实现"></a>
# Weapp Container Android implementation

[简体中文](/docs/engineering/sdk-flutter/weapp_container_android/index/) · **English**

The main branch prepares the preview.7 public release. Use public installation only after the version appears in its registry; see the [SDK home](/en/docs/engineering/sdk-flutter/index/) for installation, requirements, and status. The details below retain the pinned preview.6 source contract. Build that version from the exact checkout linked on the SDK home and do not mix it with preview.7 runtimes.


Federated native plugin for `weapp_container`. Uses Hybrid Composition and the
installed `com.sonofmagic.weapp:weapp-container-android:0.1.0-preview.5.1` AAR.
The distribution builder includes `native/maven`; source consumers may set
`weappSdkMavenDir` to a verified SDK Maven repository. Minimum Android API is 26.
No Cargo/JNI source build occurs in a consuming Flutter application.
