---
id: "docs/engineering/website/hosts/react-native/index"
title: "React Native 展示"
section: "项目与维护"
summary: "React Native 展示。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/hosts/react-native/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "88b099619334a4fb751e7e9f089c6ee9d7ef60d5"
sourcePath: "hosts/react-native/README.md"
---

<a id="react-native-showcase"></a>
# React Native 展示

**简体中文** · [English](/en/docs/engineering/website/hosts/react-native/index/)


该宿主使用 SDK Fabric 本机视图和 TurboModule。该演示在本机引擎内运行； Metro 仅提供 React Native 宿主 UI。本地状态使用 AsyncStorage 和版本化的访客桥。 Android 后退和关闭按钮等待存储刷新和本机关闭。

将精确组合的 `react-native/android-ios` SDK 安装到 `.runtime/sdk/react-native`，然后从存储库根运行 `node tools/native-react-native-build.mjs --platform android` （或 `ios`）。 Android 版本使用 Hermes 和 R8 以及专用签名密钥。 iOS 默认为未签名的模拟器版本，并且需要 Xcode/CocoaPods.

宿主脚手架来自官方React Native Community 0.88.0模板；请参阅 `TEMPLATE-ORIGIN.json` 和 `TEMPLATE-LICENSE`。运行时依赖项是经过审查的私有 SDK 的本地依赖项，并且不会获取源存储库。
