---
id: "architecture"
title: "Architecture and lifecycle"
section: "Get started"
summary: "JavaScript engines, presentation, host views, and session resource ownership."
route: "/docs/architecture/"
locale: "en"
---

RUNTIME

<a id="运行架构与生命周期"></a>
# Runtime architecture and lifecycle

[简体中文](architecture.md) · **English**


Application JavaScript runs in an isolated engine; the host is responsible for application lifecycle, layout measurement, rendering surface, system capability provider and input bridging.

<a id="layers"></a>
<a id="运行分层"></a>
## Runtime layers

- **portable pack** provides compiled templates, styles, scripts, static resources, capability declarations and integrity metadata.
- **Container runtime** loads supported ECMAScript code, page data, and mini-program API facade. The compiler, runtime engine, and pack strategy need to match each other.
- **Host SDK** provides session, view, thread/actor management, actual layout and rendering backend, and capability providers.
- **Application** manages account-level storage key, foreground and background transitions, message processing and session closing. Host UI updates are controlled by business applications.

<a id="会话生命周期"></a>
## Session lifecycle

Use a unique and stable session owner, first put the View into a valid layout, and then wait for measured bounds; load local, application resources or verified pack after successful initialization. Resubmit real metrics when rotating or resizing the container. Do not mistake full screen or device screen size for inline view size.

Notify the session to suspend foreground execution when in the background; the host re-provides valid view geometry when it returns to the foreground. Close input and new tasks before destroying the UI, waiting for an asynchronous save and performing an explicit close. The SDK's close is usually executed asynchronously and cannot block waiting on the Android main thread or Flutter UI isolate.

<a id="rendering"></a>
<a id="渲染与帧呈现"></a>
## Rendering and frame presentation

The web demo runs fixed examples by Dedicated Worker, QuickJS/WASM and CanvasKit; the native SDK uses the corresponding native backend. GPU backend availability, actual swap/presentation, surface recovery, and input coordination are all recorded separately by the host platform test. Successful compilation does not mean that the actual GPU surface or user input has passed device acceptance.

<a id="host-methods"></a>
<a id="宿主方法与消息"></a>
## Host methods and messages

The mini-program calls the host method with name, payload and optional timeout/cancel token through `weappContainer.invoke`. Register host handlers before loading the pack. Calls end with a Promise, cleaning up OS requests and permissions UI on cancellation; do not automatically equate any host call with authorized payment, login, or device capabilities.

Subscribe to the return business event first, and then load the application pack. JSON boundaries only accept acyclic, finite-number JSON data. SDK event types and payloads can evolve with the protocol, and the host should safely ignore or retain the original fields for unknown events.

<a id="platform-boundaries"></a>
<a id="按证据描述平台"></a>
## Platform evidence

When using the API, check both pack manifest capabilities and host implementation capabilities. When capabilities cannot be provided, the user denies permission, or the protocol version does not match, an explicit error should be returned without forging a successful result. Per-platform conformance records and real device evidence can be found in [API reference](/en/docs/api/) and [Platform Status](/en/docs/platforms/) respectively.
