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

JDK 17, Android SDK platform and build-tools 36, NDK 27.1.12297006, CMake 3.22.1 and Gradle 8.9. The minimum Android API is 26, and the runtime library must have corresponding CPU slices. The installation tool also requires Node.js 24+ and Python 3.

<a id="prepare"></a>
<a id="1-准备-sdk"></a>
## 1. Prepare SDK

First build the current runtime library and local Maven repository from the public core repository and its fixed SDK submodules. After installing the tool chain below, press [Source Code Build](/en/docs/engineering/weapp-container/docs/sdk-source-build/) to prepare a clean checkout and execute it in the core root directory:

Execute in the clean checkout root directory of the public core repository. For the complete environment, native library slices and licensing steps, see [Build from source](/en/docs/engineering/weapp-container/docs/sdk-source-build/).

```bash
pnpm sdk:build:android -- --pack artifacts/hello-pack
```

The output is at `artifacts/sdk/android/`. Release builds require committed, clean source code; producer receipts, runtime bytes, and notices are retained. Explicit offline archiving belongs to another path, must fail when the historical default lock does not match, and cannot bypass hash checks.

Add the generated local repository to `settings.gradle.kts` of the host application:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("/absolute/weapp-container/artifacts/sdk/android/maven") }
    }
}
```

Add dependencies in the application's `build.gradle.kts` and retain the runtime bytes:

```kotlin
android {
    defaultConfig { minSdk = 26 }
    packaging {
        jniLibs.keepDebugSymbols += setOf(
            "**/libweapp_container_sdk.so", "**/libc++_shared.so",
        )
    }
}
dependencies {
    implementation("io.github.weapp-container:weapp-container-android:0.1.0-preview.7.0")
}
```

This is a local Maven repository dependency and does not require that the coordinates have been published to a public Maven service.

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

The Android wrapper source is `0.1.0-preview.7.0`, licensed under Apache-2.0. Preparation now defaults to the same-version public runtime lock; historical restricted-showcase locks remain for compatibility. Maven Central publication is incomplete; build the local Maven repository as shown above. See the [release record](/en/docs/engineering/weapp-container/docs/public-sdk-release/) for release emulator and device acceptance. [Platform status](/en/docs/platforms/) retains the separate fixed-demo record.

SDK target supports arm64 and x86_64 for Android 26+. The build also verifies ELF and 16 KB alignment, but this is not equivalent to real device boot verification. Experience graphics, touch, session background/resume, storage reopening, and asynchronous shutdown using representative emulators and real GPU surfaces.
