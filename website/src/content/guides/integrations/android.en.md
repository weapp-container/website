---
id: "integrations/android"
title: "Android"
section: "Platform integrations"
summary: "Embed Kotlin sessions and native views in Android applications."
route: "/docs/integrations/android/"
locale: "en"
---

Android / Kotlin

<a id="android-sdk-接入"></a>
# Android SDK integration

[简体中文](android.md) · **English**


Android SDK consists of Kotlin/JNI wrapper and independent precompiled runtime library, using EGL/GLES surface. The base requirements are Android API 26+ and arm64-v8a or x86_64.

<a id="prerequisites"></a>
<a id="环境要求"></a>
## Environmental requirements

JDK 17, Android SDK platform and build-tools 36, and Gradle 8.13. The minimum Android API is 26, with arm64-v8a and x86_64 support.

<a id="prepare"></a>
<a id="1-准备-sdk"></a>
## 1. Prepare SDK

`0.1.0-preview.7.1` is published on Maven Central. Confirm the public repository in the host application's `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}
```

Add the dependency in the application's `build.gradle.kts`:

```kotlin
android {
    defaultConfig { minSdk = 26 }
}
dependencies {
    implementation("io.github.weapp-container:weapp-container-android:0.1.0-preview.7.1")
}
```

Normal installation needs no core source checkout, Rust, Node.js or Python. Maintainers can generate a local Maven repository with the [maintainer source build guide](/en/docs/engineering/weapp-container/docs/sdk-source-build/). See the [SDK release status](https://github.com/weapp-container/weapp-container/blob/main/docs/public-sdk-release.en.md) for current versions, hashes and limitations.

<a id="embed"></a>
<a id="2-放入包并嵌入视图"></a>
## 2. Put it into the package and embed the view

Place the complete contents of `hello-pack/` into the application's `src/main/assets/portable-pack/`. Execute the following code in the main thread; `context` and `parent` are the context of the current Activity/Fragment and the container ViewGroup respectively.

```kotlin
import android.view.ViewGroup
import com.sonofmagic.weapp.container.sdk.*
import org.json.JSONObject

val session = WeappContainerSession(context, storageKey = "catalog:account-42")
session.eventListener = ContainerEventListener { event ->
    android.util.Log.d("Container", event.toString())
}
session.registerHostMethod("host.profile", HostMethod { _, reply ->
    reply.resolve(JSONObject().put("name", "Ada"))
})
val view = WeappContainerView(context)
parent.addView(view, ViewGroup.LayoutParams(
    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT,
))
view.bind(session)
session.load(PackSource.Asset("portable-pack")).whenComplete { _, error ->
    if (error != null) android.util.Log.e("Container", "加载失败", error)
}
```

First mount the View and bind the session, then wait for load. Connect `session.setForeground(Boolean)` to the application-visible state; wait for `flushStorage()` and `closeAsync()` in sequence when ending the function, and do not block the main thread. See [Android SDK README](https://github.com/weapp-container/sdk-android/blob/main/README.en.md) for a complete example.

<a id="host-api"></a>
<a id="可核对的-session-api"></a>
## Verifiable Session API

- `load(PackSource, LoadOptions)` runs pack when the session first loads.
- `registerHostMethod(name, HostMethod)` needs to register the host method before load.
- `prepareView()` first waits for real view metrics and creates an empty runtime, and does not execute App/Page JavaScript.
- `setForeground(Boolean)` Notifies the front and backend status.
- `flushStorage()` awaits persistence; `closeAsync()` asynchronously retires resources.
- `setWindowMetrics(WindowMetrics)` is for headless sessions that really don't have a bound View.

<a id="validation"></a>
<a id="包发布检查"></a>
## Package Release Check

**Version and Release Status**

The Android wrapper source is `0.1.0-preview.7.1`, licensed under Apache-2.0. This version is published on Maven Central and its public coordinate resolves anonymously. Maintainers can rebuild a local Maven repository with the source build guide when source changes are needed. It remains a prerelease with no stable version. See the [release record](/en/docs/licensing/) for emulator and device acceptance. [Platform status](/en/docs/platforms/) retains the separate fixed-demo record.

SDK target supports arm64 and x86_64 for Android 26+. The build also verifies ELF and 16 KB alignment, but this is not equivalent to real device boot verification. Experience graphics, touch, session background/resume, storage reopening, and asynchronous shutdown using representative emulators and real GPU surfaces.
