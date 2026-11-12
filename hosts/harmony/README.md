<a id="harmony-showcase"></a>
# 和谐展示

**简体中文** · [English](README.en.md)


ArkUI 拥有原生界面、生命周期、输入对话框和本地首选项。共享便携式包拥有演示页面。没有 Rust 或 C++ 引擎实现复制到该项目中。

使用 `tools/sdk-install.mjs` 安装 `harmony`，然后从存储库根运行 `node tools/native-harmony-build.mjs`。私有SDK必须包含`libs/arm64-v8a/libentry.so`和`libcontainer_host_harmony.so`，绑定到当前的限制策略。该构建验证两个库在未签名的 HAP 中是否保持字节相同。

需要官方DevEco工具链。设备安装和签名与编译是分开的。 `entry/src/main/cpp/types/libentry` 仅包含公共 N-API 声明。生产引擎实现保留在私有 SDK 版本中。
