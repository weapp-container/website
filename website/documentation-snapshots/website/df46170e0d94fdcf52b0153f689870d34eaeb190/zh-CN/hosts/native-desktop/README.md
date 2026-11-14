<a id="c-native-hosts"></a>
# C++ 原生宿主

**简体中文** · [English](README.en.md)


CMake 使用确切安装的 SDK 前缀中的 `WeappContainer::Desktop` 。
macOS 使用 AppKit/Metal，Windows 使用 Win32/WGL，Linux 使用 GTK3/OpenGL.
每个 UI 都会保留其事件循环，直到 SDK 发出 `Closed`； JSON 演示状态
和本机文本编辑使用共享围栏桥协议。

Run `node tools/native-consumer-build.mjs --platform macos|windows|linux`.
应用程序接收经过验证的共享包目录作为其唯一的 CLI 参数。
运行时的编译策略独立拒绝任意包。构建/链接，
GUI 执行、实际 GPU 和操作系统签名仍然是单独的检查。

nlohmann JSON 标头已获得 MIT 许可。它的原始版本、来源和字节
哈希值及其许可证保留在 `third_party/nlohmann/SOURCE.json` 中。
