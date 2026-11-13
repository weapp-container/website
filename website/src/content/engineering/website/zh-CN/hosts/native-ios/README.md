---
id: "docs/engineering/website/hosts/native-ios/index"
title: "Swift/UIKit 主机"
section: "项目与维护"
summary: "Swift/UIKit 主机。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/hosts/native-ios/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "c487eff31a98ca75905b66676909cde218e9fb42"
sourcePath: "hosts/native-ios/README.md"
---

<a id="swiftuikit-host"></a>
# Swift/UIKit 主机

**简体中文** · [English](/en/docs/engineering/website/hosts/native-ios/index/)


应用程序使用 `.runtime/sdk/ios` 中确切安装的 Swift 包，嵌入
原生 Metal 视图并拥有 UIKit 文本对话框、状态持久性和异步
关闭。 `node tools/native-consumer-build.mjs --platform ios` 生成其 Xcode
项目并为模拟器进行编译，无需签名。结果是编译完成
检查；设备 IPA 签名和实际 simulator/device 执行是独立的。
