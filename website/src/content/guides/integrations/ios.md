---
id: "integrations/ios"
title: "iOS"
section: "平台集成"
summary: "以 Swift Session 和 UIKit 视图接入 iOS。"
route: "/docs/integrations/ios/"
---

iOS / Swift

<a id="ios-sdk-integration"></a>
# iOS SDK 接入

**简体中文** · [English](ios.en.md)


iOS SDK 提供 Swift Concurrency 会话、UIKit 视图和 Metal 呈现面。最低部署目标 iOS 16.0，模拟器和真机分别锁定架构。

<a id="requirements"></a>
<a id="1-install-sdk"></a>
## 1. 安装 SDK

要求 macOS、Xcode/Apple SDK、Swift 5.9+ 与 iOS 16.0+。运行库应包含 arm64 device、arm64 simulator 和 x86_64 simulator slices。实际发行可以生成 Swift Package 或 CocoaPods 消费目录；framework 的 license 和第三方 notices 随包保留。

在公开核心仓库的干净 checkout 根目录执行。完整环境、原生切片及许可步骤见[源码构建](/docs/engineering/weapp-container/docs/sdk-source-build/)。

```bash
pnpm sdk:build:ios -- --install-framework
```

在 Xcode 中将生成的 `artifacts/sdk/ios/WeappContainer` 添加为本地 Swift Package，并把 **WeappContainer** product 加到应用 target。将整个 `hello-pack/` 文件夹作为资源加入 target，保留其目录结构。

<a id="create-session"></a>
<a id="2-mount-the-uikit-view-and-load-it"></a>
## 2. 挂载 UIKit 视图并加载

`WeappContainerSession` 由主 actor 管理。session 配置决定稳定 storage key 或 memory-only 存储。保留 UIView 的引用，并在实际 UIKit layout 后开始等待加载。

```swift
import UIKit
import WeappContainer

@MainActor
func mountContainer(in parent: UIViewController, packURL: URL) throws -> WeappContainerViewController {
    let session = WeappContainerSession(
        configuration: .init(storageKey: "catalog:account-42")
    )
    try session.registerHostMethod("host.profile") { _ in
        .object(["name": .string("Ada")])
    }
    session.onEvent = { event in
        if case .message(let message) = event { print(message) }
        if case .error(let error) = event { print(error) }
    }
    let controller = try WeappContainerViewController(session: session)
    parent.addChild(controller)
    controller.view.frame = parent.view.bounds
    controller.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    parent.view.addSubview(controller.view)
    controller.didMove(toParent: parent)
    parent.view.layoutIfNeeded()
    Task { @MainActor in
        do { try await session.load(packURL: packURL) }
        catch { print("加载失败:", error) }
    }
    return controller
}
```

在父控制器已经显示并有有效尺寸后调用该函数；`packURL` 可取 `Bundle.main.url(forResource: "hello-pack", withExtension: nil)`，需先处理资源不存在的情况。页面 owner 持有会话与子控制器，关闭前等待 `flushStorage()` 和 `close()`。完整示例见[iOS SDK README](https://github.com/weapp-container/sdk-ios/blob/main/README.md)。

<a id="events-host"></a>
<a id="events-and-host-methods"></a>
## 事件和宿主方法

设置 `session.onEvent` 接收 ready、navigation、chrome、message、error 与 closed 事件。可在 load 前通过 `registerHostMethod(_:handler:)` 登记宿主能力；handler 会收到 `WeappJSON` 并返回 `WeappJSON`。显式报告用户授权结果、取消操作与失败，不把 Objective-C/native 错误直接包装为成功 JSON。

<a id="validate"></a>
<a id="simulator-and-equipment-acceptance"></a>
## 模拟器和设备验收

**版本与发行状态**

iOS wrapper 源码为 `0.1.0-preview.6.0`，源码许可证为 Apache-2.0。当前平台记录通过 iOS Simulator 运行，尚无 Apple 真机签名。预编译 runtime 和 SDK archive 仍需按各自 lock 与随包许可证核验。

先使用发行中的编译消费者与模拟器检查路由、持久化、页面生命周期、文本输入、方向变化和 surface 恢复。Simulator 通过不代表已签署的真机产物、Metal 性能或特定设备回归通过；这些状态在验收证据中分别记录。
