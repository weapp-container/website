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


Select SDK by the application’s existing language or UI framework. Each platform uses the same portable pack, and there is no need to change mini-program development tools.

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

1. Add the SDK to the application according to the platform guide and prepare the matching runtime library.
2. Put [test package](/en/docs/start/#prepare-source) or [self-made package](/en/docs/pack/#own-miniapp) into the application resource directory.
3. Create session, mount view, call `load`. Wait for storage writeback and session close when leaving the page or route.

**Preview Release Notes**

The SDK packaging layer source code and precompiled runtime library have their own versions, licenses and release records. When using an archive, check its version lock and hash; restricted demo archives only allow specified packages. See [Licensing, Downloading and Distribution](/en/docs/licensing/) for details.

Please continue reading [Platform Status and Supported Boundaries](/en/docs/platforms/) for applicable platforms and measured boundaries.
