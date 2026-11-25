---
id: "integrations/android"
title: "Android"
section: "平台集成"
summary: "以 Kotlin Session 与 View 将运行库嵌入 Android 应用。"
route: "/docs/integrations/android/"
locale: "zh-CN"
---

Android / Kotlin

<a id="android-sdk-integration"></a>
# Android SDK 接入

**简体中文** · [English](android.en.md)


Android SDK 由 Kotlin/JNI wrapper 和独立的预编译运行库组成，使用 EGL/GLES surface。基础要求为 Android API 26+ 与 arm64-v8a 或 x86_64。

<a id="prerequisites"></a>
<a id="environmental-requirements"></a>
## 环境要求

JDK 17、Android SDK 平台和 build-tools 36、Gradle 8.13。最低 Android API 为 26，支持 arm64-v8a 与 x86_64。

<a id="prepare"></a>
<a id="1-prepare-sdk"></a>
## 1. 准备 SDK

`0.1.0-preview.7.1` 已发布到 Maven Central。在宿主应用的 `settings.gradle.kts` 中确认包含公开仓库：

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}
```

在应用的 `build.gradle.kts` 添加依赖：

```kotlin
android {
    defaultConfig { minSdk = 26 }
}
dependencies {
    implementation("io.github.weapp-container:weapp-container-android:0.1.0-preview.7.1")
}
```

普通应用安装不需要核心仓库源码、Rust、Node.js 或 Python。维护者重建运行库时可按[维护者源码构建指南](/docs/engineering/weapp-container/docs/sdk-source-build/)生成本地 Maven 仓库。当前发行版本、哈希与限制见[SDK 发行状态](https://github.com/weapp-container/weapp-container/blob/main/docs/public-sdk-release.md)。

<a id="embed"></a>
<a id="2-put-it-into-the-package-and-embed-the-view"></a>
## 2. 放入包并嵌入视图

将 `hello-pack/` 的完整内容放到应用的 `src/main/assets/portable-pack/`。在主线程执行下面的代码；`context` 和 `parent` 分别是当前 Activity/Fragment 的上下文和容器 ViewGroup。

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

先挂载 View 并绑定 session，再等待 load。将 `session.setForeground(Boolean)` 连接到应用可见状态；结束功能时依次等待 `flushStorage()` 与 `closeAsync()`，不要阻塞主线程。完整示例见[Android SDK README](https://github.com/weapp-container/sdk-android/blob/main/README.md)。

<a id="host-api"></a>
<a id="verifiable-session-api"></a>
## 可核对的 Session API

- `load(PackSource, LoadOptions)` 在 session 首次载入时运行 pack。
- `registerHostMethod(name, HostMethod)` 需要在 load 前登记宿主方法。
- `prepareView()` 先等待真实 view metrics 并创建空 runtime，不执行 App/Page JavaScript。
- `setForeground(Boolean)` 通知前后台状态。
- `flushStorage()` 等待持久化；`closeAsync()` 异步退休资源。
- `setWindowMetrics(WindowMetrics)` 适用于确实没有绑定 View 的无头会话。

<a id="validation"></a>
<a id="package-release-check"></a>
## 包发布检查

**版本与发行状态**

Android wrapper 源码为 `0.1.0-preview.7.1`，采用 Apache-2.0。该版本已发布到 Maven Central，公开坐标可匿名解析；维护者可按源码构建指南重建本地 Maven 仓库。当前仍是预览版，没有稳定版。模拟器与真机验收状态见[发行记录](/docs/licensing/)；[平台状态](/docs/platforms/)保留固定在线演示的独立记录。

SDK 目标支持 Android 26+ 的 arm64 与 x86_64。构建还校验 ELF 和 16 KB 对齐，但这不等于真实设备启动验证。使用代表性模拟器与真实 GPU surface 验收视图、触控、会话后台/恢复、存储重开及异步关闭。
