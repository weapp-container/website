<a id="swiftuikit-host"></a>
# Swift/UIKit 主机

**简体中文** · [English](README.en.md)


应用程序使用 `.runtime/sdk/ios` 中确切安装的 Swift 包，嵌入
原生 Metal 视图并拥有 UIKit 文本对话框、状态持久性和异步
关闭。 `node tools/native-consumer-build.mjs --platform ios` 生成其 Xcode
项目并为模拟器进行编译，无需签名。结果是编译完成
检查；设备 IPA 签名和实际 simulator/device 执行是独立的。
