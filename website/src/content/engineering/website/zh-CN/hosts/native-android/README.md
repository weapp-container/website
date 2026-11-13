---
id: "docs/engineering/website/hosts/native-android/index"
title: "Kotlin 宿主"
section: "项目与维护"
summary: "Kotlin 宿主。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/hosts/native-android/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "2a14c0761dcb531666b1ca0085488a8542c54206"
sourcePath: "hosts/native-android/README.md"
---

<a id="kotlin-host"></a>
# Kotlin 宿主

**简体中文** · [English](/en/docs/engineering/website/hosts/native-android/index/)


应用程序仅解析经过验证的 Maven 存储库
`.runtime/sdk/android/maven` 并加载其捆绑的共享小应用程序包。它使用
SDK 视图，测量的 Android 布局，本机 EditText 对话框，有界状态
持久化和异步关闭。未添加网络或设备权限。

在准确的 SDK 后运行 `node tools/native-consumer-build.mjs --platform android`
安装。发布版本需要与以下相同的专用签名环境
Flutter 展示；调试签名永远不会替代它。
