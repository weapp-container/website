---
id: "docs/engineering/sdk-flutter/weapp_container_android/index"
title: "Weapp Container Android implementation"
section: "SDK engineering"
summary: "Weapp Container Android implementation. Versioned engineering reference from weapp-container/sdk-flutter."
route: "/docs/engineering/sdk-flutter/weapp_container_android/index/"
locale: "en"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "2a6a2f0096b894e69d7049064d87072d8e5b3901"
sourcePath: "weapp_container_android/README.en.md"
---

<a id="weapp-容器-android-实现"></a>
# Weapp Container Android implementation

[简体中文](/docs/engineering/sdk-flutter/weapp_container_android/index/) · **English**


Federated native plugin for `weapp_container`. Uses Hybrid Composition and the
installed `com.sonofmagic.weapp:weapp-container-android:0.1.0-preview.5.1` AAR.
The distribution builder includes `native/maven`; source consumers may set
`weappSdkMavenDir` to a verified SDK Maven repository. Minimum Android API is 26.
No Cargo/JNI source build occurs in a consuming Flutter application.
