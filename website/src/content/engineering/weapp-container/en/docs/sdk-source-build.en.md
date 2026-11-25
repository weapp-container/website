---
id: "docs/engineering/weapp-container/docs/sdk-source-build"
title: "SDK Maintainer Source Build Guide"
section: "Project and maintenance"
summary: "SDK Maintainer Source Build Guide. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/docs/sdk-source-build/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "df595d6768dc1dfb70fa6c93f834b12751b4637d"
sourcePath: "docs/sdk-source-build.en.md"
---

# SDK Maintainer Source Build Guide

[简体中文](/docs/engineering/weapp-container/docs/sdk-source-build/) · **English**

This guide is for SDK maintainers and release contributors who modify wrappers, rebuild runtimes, or produce release archives. Application developers should start with the [public SDK releases](/en/docs/engineering/weapp-container/docs/public-sdk-release/), using the published package-manager dependency or prebuilt archive for their platform. A core source checkout is not required for normal use.

The core repository pins the Android, iOS, Desktop, Flutter, React Native, and Contract SDK submodules. Maintainers build runtimes from one core revision and validate the platform wrapper with the matching consumer example in its SDK README.

## Check Out the Source and Create a Portable Pack

```sh
git clone --recurse-submodules https://github.com/weapp-container/weapp-container.git
cd weapp-container
corepack enable
pnpm install --frozen-lockfile
node sdk/contract/fixtures/make-acceptance-pack.mjs --out artifacts/hello-pack
```

A portable pack must use a format supported by the runtime. An ordinary mini-program source directory is not a valid SDK input. Existing native or framework build outputs can be packaged with the corresponding pack tool; weapp-vite is not required.

## Platform Targets

| SDK | Required development environment | Build entry and example |
| --- | --- | --- |
| Android | JDK 17, Android SDK / NDK, Gradle 8.13 | [Android SDK README](/en/docs/engineering/sdk-android/index/#1-obtain-the-runtime-library) · [reference app](/en/docs/engineering/sdk-android/consumer/index/) |
| iOS | macOS, Xcode 27.2, Swift 5.9+ | [iOS SDK README](/en/docs/engineering/sdk-ios/index/#1-obtain-runtime-library) · [UIKit consumer](/en/docs/engineering/sdk-ios/examples/consumer/index/) |
| Desktop | CMake 3.21+, C++17, target-system toolchain | [Desktop SDK README](/en/docs/engineering/sdk-desktop/index/#obtain-runtime-and-build) · [consumer](/en/docs/engineering/sdk-desktop/consumer/index/) |
| Flutter | Flutter 3.47.7, Dart 3.3+, target-platform toolchain | [Flutter SDK README](/en/docs/engineering/sdk-flutter/index/#2-build-a-distribution-and-run-the-example) · [example app](/en/docs/engineering/sdk-flutter/example/index/) |
| React Native | Node.js 24, React Native 0.88, Android or Apple native toolchain | [React Native SDK README](/en/docs/engineering/sdk-react-native/index/#build-a-distribution-from-source) · [example app](/en/docs/engineering/sdk-react-native/example/index/) |
| Contract C ABI | CMake 3.21+, target-system C compiler | [Contract SDK README](/en/docs/engineering/sdk-contract/index/) · [C ABI host example](/en/docs/engineering/sdk-contract/examples/consumer/index/) |

The core repository has no `pnpm sdk:build:*` commands. Source builds use the runtime builder, license collector, and each SDK wrapper's build tool as separate steps. The following copyable examples cover Android, iOS, and macOS arm64. Use the matching Rust target and platform toolchain for other targets.

### Android

```sh
node scripts/sdk-native-build.mjs --target aarch64-linux-android --out artifacts/sdk/native
node scripts/sdk-licenses.mjs --target aarch64-linux-android --features quickjs-native-android,skia-gpu-gles
node scripts/sdk-native-build.mjs --target x86_64-linux-android --out artifacts/sdk/native
node scripts/sdk-licenses.mjs --target x86_64-linux-android --features quickjs-native-android,skia-gpu-gles
node sdk/android/tools/build.mjs --native-root artifacts/sdk/native \
  --licenses-root artifacts/sdk/licenses --pack artifacts/hello-pack \
  --out artifacts/sdk/android
```

### iOS

```sh
node scripts/sdk-native-build.mjs --target aarch64-apple-ios --out artifacts/sdk/native
node scripts/sdk-licenses.mjs --target aarch64-apple-ios --features quickjs-native-ios,skia-gpu-metal
node scripts/sdk-native-build.mjs --target aarch64-apple-ios-sim --out artifacts/sdk/native
node scripts/sdk-licenses.mjs --target aarch64-apple-ios-sim --features quickjs-native-ios,skia-gpu-metal
node scripts/sdk-native-build.mjs --target x86_64-apple-ios --out artifacts/sdk/native
node scripts/sdk-licenses.mjs --target x86_64-apple-ios --features quickjs-native-ios,skia-gpu-metal
node sdk/ios/tools/build.mjs --native-root artifacts/sdk/native \
  --licenses-root artifacts/sdk/licenses --out artifacts/sdk/ios --install-framework
```

### Desktop on Apple Silicon

```sh
node scripts/sdk-native-build.mjs --target aarch64-apple-darwin --out artifacts/sdk/native
node scripts/sdk-licenses.mjs --target aarch64-apple-darwin --features quickjs-native,skia-gpu-metal
node sdk/desktop/tools/build.mjs --target macos-arm64 \
  --native-root artifacts/sdk/native --licenses-root artifacts/sdk/licenses \
  --pack artifacts/hello-pack --out artifacts/sdk/desktop --verify
```

The `sdk-native-build.mjs` script defaults to a release profile and writes a versioned `build.json` beside each target's libraries. The license collector defaults to `artifacts/sdk/licenses/<target>`. Pass `--out` to choose another location, then provide the same locations to the wrapper build.

The React Native example consumes the published npm prerelease:

```sh
mkdir -p /tmp/weapp-rn-package
npm pack @weapp-container/react-native@0.1.0-preview.7.1 --pack-destination /tmp/weapp-rn-package
node sdk/react-native/tools/create-consumer.mjs \
  --package /tmp/weapp-rn-package/weapp-container-react-native-0.1.0-preview.7.1.tgz \
  --out /tmp/weapp-rn-consumer
```

The Flutter example uses the sibling `weapp_container` path package:

```sh
cd sdk/flutter/example
flutter pub get
flutter analyze lib
flutter run -d <device-id>
```

### Contract C ABI

The Contract example consumes a C ABI static library built for the local target. The following commands use Apple Silicon macOS. Use the matching Rust target and output directory for another platform:

```sh
node scripts/sdk-native-build.mjs --target aarch64-apple-darwin --out artifacts/sdk/native
cmake -S sdk/contract/examples/consumer -B artifacts/sdk/contract-consumer \
  -DWEAPP_CONTAINER_SDK_INCLUDE_DIR="$PWD/artifacts/sdk/native/aarch64-apple-darwin" \
  -DWEAPP_CONTAINER_SDK_LIBRARY="$PWD/artifacts/sdk/native/aarch64-apple-darwin/libweapp_container_sdk.a"
cmake --build artifacts/sdk/contract-consumer --config Release
artifacts/sdk/contract-consumer/contract_consumer "$PWD/artifacts/hello-pack"
```

This command-line consumer checks the ABI, registers and completes the sample host method, waits for a frame and inspects its pixels, then waits for the session's close event. Contract defines native host interfaces and does not provide a platform UI.

Each SDK page describes platform flags, installation layout, host services, and lifecycle handling. Run the smallest relevant build before the consumer example. Compilation alone does not establish device, GPU, or performance acceptance.

## Build Records

Release builds must use clean, committed source and retain build receipts, runtime and SDK versions, target architectures, and notices. Verify prebuilt archives against their manifests for version, architecture, size, and SHA-256. Default locks for historical private archives are not download instructions for new users. See the [public SDK release status](/en/docs/engineering/weapp-container/docs/public-sdk-release/) for artifact availability.
