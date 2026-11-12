---
id: "architecture"
title: "运行架构与生命周期"
section: "开始使用"
summary: "了解 JS 引擎、Skia 呈现、宿主视图和会话资源的生命周期边界。"
route: "/docs/architecture/"
locale: "zh-CN"
---

运行时

<a id="runtime-architecture-and-lifecycle"></a>
# 运行架构与生命周期

**简体中文** · [English](architecture.en.md)


业务 JavaScript 由隔离引擎执行；宿主负责应用生命周期、布局测量、呈现表面、系统能力提供者与输入桥接。

<a id="layers"></a>
<a id="runtime-layers"></a>
## 运行分层

- **portable pack**提供编译后的模板、样式、脚本、静态资源、能力声明和完整性身份。
- **容器运行时**加载受支持的 ECMAScript 代码、页面数据和小程序 API facade。编译器、运行引擎及 pack 策略需要彼此匹配。
- **宿主 SDK**提供 session、view、线程/actor 管理、实际布局和呈现后端，以及 capability providers。
- **应用**管理账号级 storage key、前后台切换、消息处理和会话关闭。主机 UI 更新由业务应用掌控。

<a id="session-lifecycle"></a>
## 会话生命周期

使用唯一且稳定的 session owner，先把 View 放入有效布局，再等待 measured bounds；初始化成功后加载本地、应用资源或经验证的 pack。旋转或变更容器尺寸时重新提交真实 metrics，不要把全屏或设备屏幕尺寸误作内嵌视图尺寸。

后台时通知 session 暂停前台执行；重新前台时宿主重新提供有效视图几何。销毁 UI 之前先关闭输入和新任务，等待异步保存并执行显式 close。SDK 的 close 通常异步执行，不能在 Android 主线程或 Flutter UI isolate 上阻塞等待。

<a id="rendering"></a>
<a id="rendering-and-frame-presentation"></a>
## 渲染与帧呈现

Web 演示由 Dedicated Worker、QuickJS/WASM 与 CanvasKit 运行固定示例；原生 SDK 使用相应原生 backend。GPU 后端可用性、实际 swap/presentation、surface 恢复和输入协调都由宿主平台测试分别记录。编译成功并不代表实际 GPU surface 或用户输入已通过设备验收。

<a id="host-methods"></a>
<a id="host-methods-and-messages"></a>
## 宿主方法与消息

小程序通过 `weappContainer.invoke` 调用有名称、payload 与可选 timeout/cancel token 的宿主方法，应用必须在加载前登记。调用以 Promise 结束，取消时清理 OS 请求及权限 UI；不要将任何宿主调用自动等同于已授权的付款、登录或设备能力。

回程业务事件先订阅，再加载应用 pack。JSON 边界只接受无环、有限数字的 JSON 数据。SDK 事件类型及 payload 可随协议演进，主机对未知事件应安全忽略或保留原始字段。

<a id="platform-boundaries"></a>
<a id="platform-evidence"></a>
## 按证据描述平台

使用 API 时同时检查 pack manifest 能力与宿主实现能力。无法提供能力、用户拒绝权限或协议版本不符时，应返回显式错误，不伪造成功结果。逐平台 conformance 记录和真实设备证据分别见 [API 清单](/docs/api/)与[平台状态](/docs/platforms/)。
