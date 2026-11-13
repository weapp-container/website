---
id: "integrations/flutter"
title: "Flutter"
section: "平台集成"
summary: "通过 weapp_container Controller 和 Widget 接入五个平台。"
route: "/docs/integrations/flutter/"
locale: "zh-CN"
---

Flutter / Dart

<a id="flutter-sdk-integration"></a>
# Flutter SDK 接入

**简体中文** · [English](flutter.en.md)


`weapp_container` 使用应用可持有的 Controller 管理 session，并以 Widget 将原生 view 放入 Flutter layout。

<a id="platforms"></a>
<a id="prepare-native-dependencies-from-current-source-code"></a>
## 从当前源码准备原生依赖

先从公开核心仓库及固定 SDK 子模块构建 Android/iOS 或对应 Desktop SDK，再生成本地 reviewed manifest。框架包装层会核验原生归档和安装收据，不会隐式下载匹配不明的历史二进制。[源码构建](/docs/engineering/weapp-container/docs/sdk-source-build/)提供完整打包、离线准备和框架构建顺序。以下示例使用该流程生成的本地 SDK。

<a id="controller"></a>
<a id="1-add-sdk-dependency"></a>
## 1. 添加 SDK 依赖

仓库当前平台矩阵参考 Flutter 3.47.7。原生 SDK 目标为 Android API 26+、iOS 16+ 和 macOS 12+。Windows/Linux 还需要确切的 native distribution 和在目标系统上验证相符的 CMake/GTK/OpenGL backend。依赖源包含同一 checkout 下的平台 federated packages；如迁移目录，请一起保留这些本地相对路径 packages。

```yaml
dependencies:
  weapp_container:
    path: /absolute/path/sdk-flutter/weapp_container
```

本地 checkout 与 npm/pub registry 发布不是同一件事；只有经审核的 runtime 及 license archive 才应被包含在可分发 SDK 中。

安装与原生依赖准备见[Flutter SDK README](https://github.com/weapp-container/sdk-flutter/blob/main/README.md)。将 `hello-pack/` 解包到应用可读的本地目录；可参考[完整示例](https://github.com/weapp-container/sdk-flutter/blob/main/example/lib/main.dart)从 Flutter assets 复制包文件的实现。

<a id="mount-load"></a>
<a id="2-create-controller"></a>
## 2. 创建 Controller

在页面初始化逻辑中执行，保留 Controller 和事件订阅，不要放进 `build()`：

```dart
import 'package:weapp_container/weapp_container.dart';

final controller = await WeappContainerController.create(
  storageKey: 'account-42:catalog',
);
await controller.registerHostMethod('host.echo', (call) async {
  call.cancellation.throwIfCancelled();
  return {'value': call.payload};
});
final subscription = controller.events.listen((event) {
  if (event.type == 'message') debugPrint(event.toString());
});
```

<a id="api"></a>
<a id="3-mount-the-widget-and-load-the-pack"></a>
## 3. 挂载 Widget 并加载

在页面的 `build()` 中使用已经创建的 Controller：

```dart
SizedBox(
  height: 480,
  child: WeappContainerView(controller: controller),
);
```

把该 Widget 放进页面后，由初始化逻辑调用加载；SDK 等待有效布局：

```dart
await controller.load('/absolute/app-support/hello-pack');
```

页面 owner 结束使用时等待关闭：

```dart
await subscription.cancel();
await controller.flushStorage();
await controller.close();
```

Widget 卸载与会话关闭分开处理；创建期间页面退出时也要释放稍后返回的 Controller。页面隐藏或恢复时调用 `setForeground`，完整 owner 实现见上面的示例。

<a id="validation"></a>
<a id="main-api"></a>
## 主要 API

- `WeappContainerController.create`：选 persistent storage key 或按支持平台明确请求 memory-only。
- `registerHostMethod`：load 前登记 Future/FutureOr 宿主方法和取消处理。
- `load`、`sendMessage`、`navigate`、`back`：操控 app session 与业务消息。
- `setForeground`：将应用前后台状态传给原生宿主。
- `flushStorage`、`close`：显式持久化并退休原生 resources。
- `pendingHostLayout` 和 `acceptedHostLayout`：仅在选择 atomic host layout 时观察布局协议；观测不等于 native 已接受。

<a id="platform-verification"></a>
## 平台验证

**版本与发行状态**

Flutter wrapper 当前为 `0.1.0-preview.7.0`，Flutter 版本固定为 3.47.7。当前公开锁包含五个平台的原生输入；旧在线演示的缺口不代表当前源码结论。pub.dev 七包发布与真实 hosted 消费尚未完成，Android 也等待 Central 依赖。继续使用源码构建路径，并以[发行记录](/docs/engineering/weapp-container/docs/public-sdk-release/)区分编译、模拟器和真机验证。

Flutter 仓库维护跨平台 packages 和独立示例。依据当前可用 SDK pin 运行各自 `prepare-native`、插件构建、example consumer 和真实设备检查；Windows/Linux 桌面 graphics 与 Flutter plugin ABI 必须在目标系统本身验收。
