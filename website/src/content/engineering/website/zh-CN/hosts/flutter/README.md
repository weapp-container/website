---
id: "docs/engineering/website/hosts/flutter/index"
title: "原生展示"
section: "项目与维护"
summary: "原生展示。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/hosts/flutter/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "2a14c0761dcb531666b1ca0085488a8542c54206"
sourcePath: "hosts/flutter/README.md"
---

<a id="native-showcase"></a>
# 原生展示

**简体中文** · [English](/en/docs/engineering/website/hosts/flutter/index/)


一个 Flutter 项目面向 Android、iOS、macOS、Windows 和 Linux。它嵌入了
原生 QuickJS/Skia SDK。宿主拥有原生文本编辑，持久的演示状态，
测量布局并等待会话结束。桥接消息如下
`miniapp/BRIDGE.md`; 回复保留了访客会话、页面和请求身份。

将匹配的受限 Flutter SDK 发行版安装到 `.runtime/sdk/flutter` 中，
然后运行 ​​`node tools/native-build.mjs --platform android`。构建器同步
共享 `artifacts/miniapp/pack`;该应用程序不公开任何包加载器。

Release Android 使用独立的密钥库和 R8； Flutter发布构建使用
`--obfuscate` 具有私有符号输出。 iOS 模拟器调试版本是分开的
开发检查。 Apple 设备签名和 macOS 公证需要其
自己配置的身份。
