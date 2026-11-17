---
id: "sdk-api"
title: "Host SDK APIs"
section: "API reference"
summary: "Sessions, controllers, views, events, and host messaging across SDKs."
route: "/docs/sdk-api/"
locale: "en"
---

HOST SDK

<a id="宿主-sdk-api"></a>
# Host SDK API

[简体中文](sdk-api.md) · **English**


The API below is a public integration layer for the host application to control the runtime. Each language uses native asynchronous and JSON types; do not regard private engine commands as stable application interfaces.

<a id="shared-bridge"></a>
<a id="小程序到宿主weappcontainer"></a>
## Mini-program to host: weappContainer

Shared TypeScript declaration exports `weappContainer` global bridge:

```typescript
interface WeappContainerBridge {
  invoke(method: string, payload?: JsonValue,
         options?: {timeout?: number; cancelToken?: string}): Promise<JsonValue>;
  postMessage(payload: JsonValue): void;
  onMessage(listener: (payload: JsonValue) => void): void;
  offMessage(listener?: (payload: JsonValue) => void): void;
}
```

The host registers the application handler with a unique method name, which is then called asynchronously by the mini-program. Call failures, cancellations, timeouts, and permission denied must have structured errors and must not implicitly pretend to be successful. Actual messages are handled in JSON and event order as per the host SDK documentation.

<a id="session-apis"></a>
<a id="跨平台会话操作"></a>
## Cross-platform session operations

Most wrappers are organized around "creating owner, preparing view, loading local pack, observing events, foreground and background transitions, storage flush, await close". C++ returns the call result as `Status`; Swift uses the main actor with async/throws; Android returns `CompletableFuture`; Flutter uses `Future`; React Native uses `Promise`.

<a id="api-create"></a>
<a id="创建和配置"></a>
### Create and configure

- `WeappContainerSession` and its configuration: Android and iOS.
- `Session::create(Config, Status&)`: C++ Desktop.
- `WeappContainerController.create`: Flutter and React Native.
- Stable storage key is specified by app/account scope; memory-only must be selected explicitly.

<a id="api-load"></a>
<a id="加载程序"></a>
### Loading packs

- Android `load(PackSource, LoadOptions)` can take a verified directory or app Assets.
- iOS `load(packURL:, route:, options:)` Use local URLs.
- C++ `Session::load(directory, options)` uses unpacked directories.
- Flutter `controller.load(path)` and React Native `controller.load(source)` use release policy supported origins.

<a id="api-message"></a>
<a id="注册和消息"></a>
### Host methods and messages

Register application-level bridging methods through each wrapper's `registerHostMethod`. Send and receive business data using `sendMessage`, event callbacks, or event streams.

<a id="api-host-events"></a>
<a id="状态事件和宿主视图"></a>
### State, events, and host views

Use `state()`, `capabilities()`, `onEvent` or `subscribe` to get a public snapshot. The container View is placed into the container according to the normal native/framework layout and reports the real size. Framework unmounting only removes the View and should not accidentally rebuild the business controller.

<a id="api-close"></a>
<a id="刷新和关闭"></a>
### Persisting state and closing

Call `flushStorage` at the independent durability boundary, then await session `close` / `closeAsync`. Native shutdown may require waiting for background GPU and engine workers to finish; do not block the UI thread.

<a id="api-layout-extension"></a>
<a id="进阶布局协议"></a>
## Advanced layout protocol

There are also incremental protocols such as atomic host layout, observation identities, pack attempt journal receipts and render presentation receipts in the shared SDK contract and Swift/Kotlin wrappers. These APIs are additive protocols for specific preview versions; they can only be called if negotiated capabilities returned by the target SDK are true. Large integer IDs are represented as decimal strings on the JSON wire. Do not convert it to floating point `Number` or use the ready receipt instead of the actual accepted layout/frame presented event.

For a complete language-level interface, please open the [Shared SDK contracts](https://github.com/weapp-container/sdk-contract/blob/main/README.en.md) and the current release header file/declaration of the platform repository that is matched with the target runtime.
