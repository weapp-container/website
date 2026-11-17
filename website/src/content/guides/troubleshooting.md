---
id: "troubleshooting"
title: "故障排查"
section: "发行与支持"
summary: "排查 manifest、哈希、宿主生命周期、布局与渲染问题。"
route: "/docs/troubleshooting/"
locale: "zh-CN"
---

故障排查

<a id="troubleshooting"></a>
# 故障排查

**简体中文** · [English](troubleshooting.en.md)


优先使用明确错误码、receipt 和可重现的 pack，再定位宿主或运行时行为。

<a id="version-mismatch"></a>
<a id="version-or-abi-mismatch-during-download-or-preparation"></a>
## 下载或准备时出现版本/ABI 不匹配

先读取 SDK、runtime distribution 与当前 lock 的版本、ABI、platform、architecture、size、SHA-256 和 profile。当前 SDK 源码与默认版本化公开锁均为 preview.7.0；未带版本的旧锁仅用于历史兼容。自定义 manifest 必须与源码和归档版本匹配。不要改写锁来匹配旧二进制，也不要从其他机器拷贝未标识的 native 库。

<a id="integrity-failed"></a>
<a id="pack-integrity-verification-fails"></a>
## pack 文件完整性失败

检查 `manifest.json` 的 schema、唯一根哈希、每个内容 blob 的完整 SHA-256，以及所有资源是否位于 pack root。避免分包、目录遍历、遗漏的 vendor、文件大小截断和动态覆盖资源。重建一份完整 pack 后再安装，不要重试加载已经失败的部分目录。

<a id="unsupported-capability"></a>
<a id="unsupported-capability-or-caniuse-returns-false"></a>
## unsupported capability 或 canIUse 返回 false

查看 pack manifest 请求值、runtime policy ceiling、SDK negotiated capabilities、宿主提供者和系统权限。capability 默认值不是平台保证。请在[默认能力](/docs/api/capability-defaults/)与具体[API 分组](/docs/api/)页比对，优先处理结构化 `ERR_UNSUPPORTED_CAPABILITY` 和 permission error。

<a id="blank-view"></a>
<a id="blank-view-after-the-ready-event"></a>
## View 为空、报 ready 后没有画面

确认 View 已加入实际 window、宽高为正、density/pixel ratio 不是 0、系统 graphics context 可用。原生 view 事件与 runtime ready 分开记录；检查首帧/present completion 和 SDK error events。Android、iOS/Desktop 各自在 GPU backend 失败时有明确错误，不能自动推断有 CPU fallback。

<a id="lifecycle"></a>
<a id="events-stop-after-backgrounding-and-resuming"></a>
## 切后台恢复后事件停止

把 Activity/scene 生命周期传入 `setForeground`。保留原有 session owner 后重新挂载 View，不要因为 temporary unmount 又创建一个同 account storage key 的并发 writer。检查 storage write acknowledgement、cancelled host calls 和 View retirement receipt。

<a id="render-input"></a>
<a id="rendering-works-but-taps-or-text-input-fail"></a>
## 程序可以操作但点击/输入失败

验证系统给 guest 的 touch 坐标使用容器真实 bounds，不使用全屏设备几何。文字编辑桥接不是 IME/accessibility 完整兼容；原生 wrapper 的 Native Text、长按和多指手势存在 preview 限制。比较同一设备 on-screen editor 和 app-specific bridge，再查询各宿主限制。

<a id="attach-diagnostics"></a>
<a id="collect-diagnostics"></a>
## 提取可用诊断信息

- 保留 exception code/message、SDK 版本、ABI、OS/架构、pack root 与 profile。
- 附上原始 artifact lock hash、独立 consumer 构建命令和完整退出码。
- 宿主错误必须分清输入验证、权限拒绝、引擎执行、GPU 呈现、持久化与显式关闭。
- 共享至 issue 或工单之前删除 token、设备 account、private source path 和用户 data。
