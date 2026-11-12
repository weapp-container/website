---
id: "sdk-api"
title: "宿主 SDK API"
section: "API 参考"
summary: "跨平台 Session、Controller、View、事件和宿主消息 API 概览。"
route: "/docs/sdk-api/"
---

宿主 SDK

<a id="host-sdk-api"></a>
# 宿主 SDK API

**简体中文** · [English](sdk-api.en.md)


下方 API 是宿主应用控制运行时的公开包装层。各语言采用原生异步和 JSON 类型；不要把私有 engine 命令当成稳定消费接口。

<a id="shared-bridge"></a>
<a id="mini-program-to-host-weappcontainer"></a>
## 小程序到宿主：weappContainer

共享 TypeScript 声明导出 `weappContainer` 全局 bridge：

```typescript
interface WeappContainerBridge {
  invoke(method: string, payload?: JsonValue,
         options?: {timeout?: number; cancelToken?: string}): Promise<JsonValue>;
  postMessage(payload: JsonValue): void;
  onMessage(listener: (payload: JsonValue) => void): void;
  offMessage(listener?: (payload: JsonValue) => void): void;
}
```

宿主以唯一 method name 登记业务处理器，再由小程序异步调用。调用失败、取消、超时和 permission denied 必须带结构化错误，不得隐式伪装成功。实际消息按宿主 SDK 文档处理 JSON 与事件顺序。

<a id="session-apis"></a>
<a id="cross-platform-session-operations"></a>
## 跨平台会话操作

多数包装层围绕“创建 owner、准备 view、加载本地 pack、观察事件、前后台切换、存储 flush、await close”组织。C++ 以 `Status` 返回调用结果；Swift 使用主 actor 与 async/throws；Android 返回 `CompletableFuture`；Flutter 使用 `Future`；React Native 使用 `Promise`。

<a id="api-create"></a>
<a id="create-and-configure"></a>
### 创建和配置

- `WeappContainerSession` + 配置: Android, 组合iOS。
- `Session::create(Config, Status&)`: C++ 桌面 ; (简体中文)
- `WeappContainerController.create`：Flutter 和 React Native。
- 稳定的 storage key 按 app/account scope 指定；memory-only 必须显式选择。

<a id="api-load"></a>
<a id="loading-packs"></a>
### 加载程序

- Android `load(PackSource, LoadOptions)` 可取已验证目录或 app Assets。
- iOS `load(packURL:, route:, options:)` 使用本地 URL。
- C++ `Session::load(directory, options)` 使用已解包目录。
- Flutter `controller.load(path)` 和 React Native `controller.load(source)` 使用发行策略支持的来源。

<a id="api-message"></a>
<a id="host-methods-and-messages"></a>
### 注册和消息

通过每种 wrapper 的 `registerHostMethod` 登记应用级桥接方法。使用 `sendMessage`、事件回调或 events stream 发送和接收业务数据。

<a id="api-host-events"></a>
<a id="state-events-and-host-views"></a>
### 状态、事件和宿主视图

使用 `state()`、`capabilities()`、`onEvent` 或 `subscribe` 取得公开快照。容器View按普通原生/框架布局放入容器并报告真实尺寸。框架卸载只移除 View，不应意外重建业务 Controller。

<a id="api-close"></a>
<a id="persisting-state-and-closing"></a>
### 刷新和关闭

在独立耐久性边界调用 `flushStorage`，然后 await session `close` / `closeAsync`。原生关闭可能需要等待后台 GPU 和 engine worker 收尾；不要阻塞 UI 线程。

<a id="api-layout-extension"></a>
<a id="advanced-layout-protocol"></a>
## 进阶布局协议

共享 SDK contract 与 Swift/Kotlin wrappers 中还存在 atomic host layout、observation identities、pack attempt journal receipts 与 render presentation receipts 等增量协议。这些 API 是特定预览版本的 additive protocol；只有目标 SDK 返回的 negotiated capabilities 为真时才可调用。大整数 ID 在 JSON wire 上以 decimal strings 表示。不要把它转换为浮点 `Number` 或用准备态 receipt 代替真正接受的布局/帧 presented 事件。

语言级完整接口请打开与 target runtime 配套的 [共享 SDK 合约](https://github.com/weapp-container/sdk-contract/blob/main/README.md) 和平台仓库的当前发布包头文件/声明。
