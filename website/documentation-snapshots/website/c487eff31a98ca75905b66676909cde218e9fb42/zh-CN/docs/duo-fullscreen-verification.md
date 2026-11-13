<a id="duo-full-screen-historical-acceptance-summary"></a>
# Duo 全屏历史验收摘要

**简体中文** · [English](duo-fullscreen-verification.en.md)


2026-11-06 的 candidate10 涵盖 Web 全屏、安全区和部分 Apple 模拟器场景；完整过程、失败尝试、原始 JSON、截图和私有 instrumentation 保存在[私有档案](archived-evidence.md)。本次开源整理不将这些旧结果视为当前源码的重新验收。

历史运行库 sourceCommit 为 `e2a091b1124104a8d300b82f92d5bb36f3082903`，packRoot 为 `a0f5c48698c911436ce64ef63622c01cce99dbd17bbaaba0f6b25a44de696aaf`，policySha256 为 `57651739c7f50cd8dd0ca7a18c30681077a0a02b04e7e7e668acad64fad18031`。原 Web 归档 SHA-256 为 `553bbcc1cc4919d60832929ce99a1c640af4ae0677e0693dd48d94016639b7df`。旧发行资产、许可和哈希不作为新的开源发行物重发。

历史原生 Swift / Flutter iOS 验证包含只读 state 恒等、UIKit witness 和已呈现帧比较。部分 RTL / 嵌入用私有测试宿主执行；独立 Flutter widget 嵌入修改了 Dart，不能扩大为生产应用完整验证或任意 FlutterViewController 嵌入支持。早期过期、LTR 或几何不符采样已从有效结果中排除，失败记录仍在私有归档。

Web 设备预设检查不能替代 Apple 真机、签名或其他系统验证。当前源码发布须重新构建并记录实际执行范围；平台历史状态见 [platforms](platforms.md)。
