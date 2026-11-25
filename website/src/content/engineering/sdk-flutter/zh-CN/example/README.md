---
id: "docs/engineering/sdk-flutter/example/index"
title: "Flutter SDK 消费者"
section: "项目与维护"
summary: "Flutter SDK 消费者。来自 weapp-container/sdk-flutter 的版本化工程说明。"
route: "/docs/engineering/sdk-flutter/example/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-flutter"
sourceCommit: "0cbeb4d1eb69cc3b08a315082f607cf786875044"
sourcePath: "example/README.md"
---

<a id="flutter-sdk-consumer"></a>
# Flutter SDK 消费者

**简体中文** · [English](/en/docs/engineering/sdk-flutter/example/index/)

此应用通过 path dependency 使用同仓库的 `../weapp_container`，并从 `assets/portable-pack` 加载示例 pack。公开 Flutter SDK 为 `0.1.0-preview.7.1`，仍是预览版。pub.dev 安装方式和平台状态见 [SDK README](/docs/engineering/sdk-flutter/index/)；Apple 平台的原生归档限制见[公开发行状态](/docs/engineering/weapp-container/docs/public-sdk-release/)。

## 运行示例

在 `example/` 目录执行以下命令：

```sh
# Generate the example pack, then add the platform project folders.
node shared/make-fixture.mjs --out assets/portable-pack
flutter create --empty --platforms=android,ios,macos,linux,windows .
flutter pub get
flutter analyze lib
flutter run -d <device-id>
```

`make-fixture.mjs` 会生成 `assets/fixture-index.json` 和应用需要的 portable pack。资源和平台目录由示例 `.gitignore` 排除，重新克隆后需要再次执行这两个生成步骤。只构建一个目标时，将 `flutter create --platforms` 改为对应的平台名称。

Android 工程生成后，在 `android/app/build.gradle.kts` 的 `defaultConfig` 中将 `minSdk = flutter.minSdkVersion` 替换为 `minSdk = 26`。这是 `weapp_container_android` 的最低支持版本；`tools/package.mjs` 生成的分发工程会自动写入该值。

示例覆盖原生 View、点击和滚动、导航、消息、宿主方法、前后台状态、失败重载、持久化重开及重复关闭。运行结果显示在屏幕上，并写入应用支持目录中的 `sdk-flutter-report.json`。

修改 fixture 后需要刷新测试 pack 及其 `fixture-index.json` 时，在 `example/` 目录重新执行：

```sh
node shared/make-fixture.mjs --out assets/portable-pack
```

可选的 C ABI fixture 检查需要运行库、pack 和报告路径：

```sh
python3 shared/verify-fixture.py <shared-library> assets/portable-pack <report-path>
```

## 平台构建

仓库工作流固定使用 Flutter 3.47.7。Android 构建需要 Android SDK 35 和 36、NDK `27.1.12297006`、CMake 3.22.1；使用以下命令构建 arm64 与 x86_64：

```sh
flutter build apk --debug --target-platform android-arm64,android-x64
```

iOS 最低部署目标为 iOS 16，macOS 最低为 macOS 12。当前预览版中，iOS/macOS Podspec 引用的独立 SDK 归档不可用，需按[源码构建指南](/docs/engineering/weapp-container/docs/sdk-source-build/)准备对应原生 SDK。Linux 与 Windows 使用 Desktop CMake 归档，并需要目标系统工具链。每个目标的构建、模拟器和设备验收分别记录。

## 维护位置

Flutter example 位于本仓库的 `example/`。共享 fixture 生成器位于 `example/shared/`；原生 Desktop consumer 与其自动化位于 `native_desktop/`。
