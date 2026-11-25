---
id: "integrations"
title: "Integrations"
section: "Platform integrations"
summary: "Compare Android, iOS, desktop, Flutter, React Native, and browser demonstrations."
route: "/docs/integrations/"
locale: "en"
---

INTEGRATIONS

<a id="接入方式"></a>
# Platform integrations

[简体中文](integrations.md) · **English**


Select an SDK by your application's existing language or UI framework. Each platform uses the same portable pack, so you can keep your mini-program development tools. Normal integration uses the public package-manager dependency or prebuilt SDK archive listed in each platform guide.

<a id="sdk-与宿主"></a>
## SDK and host

- [**Android**: Kotlin sessions and GLES views, Android API 26+.](/en/docs/integrations/android/)
- [**iOS**: Swift Concurrency sessions and UIKit views, iOS 16.0+.](/en/docs/integrations/ios/)
- [**C++ Desktop**: C++17 sessions and native hosts for macOS, Windows, and Linux.](/en/docs/integrations/desktop/)
- [**Flutter**: `weapp_container` controllers and widgets; validation is recorded separately for each platform.](/en/docs/integrations/flutter/)
- [**React Native**: Fabric views and TurboModule, React Native 0.88.](/en/docs/integrations/react-native/)
- [**Web demo**: the fixed browser example and its runtime boundaries.](/en/docs/integrations/web/)
- [**HarmonyOS example**: ArkTS Showcase and the existing build and runtime records.](/en/docs/integrations/harmony/)

<a id="共通步骤"></a>
## Common steps

1. Install the currently available SDK release from the platform guide. Check whether your target platform has a usable public release.
2. Put [test package](/en/docs/start/#prepare-source) or [self-made package](/en/docs/pack/#own-miniapp) into the application resource directory.
3. Create session, mount view, call `load`. Wait for storage writeback and session close when leaving the page or route.

**Preview Release Notes**

Android is available from Maven Central, Contract and React Native packages from npm, and Flutter packages from pub.dev. iOS and Desktop use prebuilt archives in the core prerelease. Public React Native native builds are currently limited to Android, and Flutter Apple-platform archives are unavailable. SDK wrappers and runtimes have separate versions, licenses and release records. Check the published hash and license before using an archive. See [Licensing, Downloading and Distribution](/en/docs/licensing/) and [SDK release status](https://github.com/weapp-container/weapp-container/blob/main/docs/public-sdk-release.en.md).

Please continue reading [Platform Status and Supported Boundaries](/en/docs/platforms/) for applicable platforms and measured boundaries.
