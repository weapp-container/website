---
id: "integrations/ios"
title: "iOS"
section: "平台集成"
summary: "以 Swift Session 和 UIKit 视图接入 iOS。"
route: "/docs/integrations/ios/"
locale: "zh-CN"
---

iOS / Swift

<a id="ios-sdk-integration"></a>
# iOS SDK 接入

**简体中文** · [English](ios.en.md)


iOS SDK 提供 Swift Concurrency 会话、UIKit 视图和 Metal 呈现面。最低部署目标 iOS 16.0，模拟器和真机分别锁定架构。

<a id="requirements"></a>
<a id="1-install-sdk"></a>
## 1. 安装 SDK

当前发行要求 macOS、Xcode 27.2+ 及 iOS 27.1+ 编译 SDK；部署最低版本仍为 iOS 16.0。运行库应包含 arm64 device、arm64 simulator 和 x86_64 simulator slices。实际发行可以生成 Swift Package 或 CocoaPods 消费目录；framework 的 license 和第三方 notices 随包保留。

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

iOS wrapper 源码为 `0.1.0-preview.7.0`，采用 Apache-2.0。GitHub prerelease 与公开 CocoaPods Specs 已提供；公开 SwiftPM 消费、真机目标编译和 arm64 模拟器交互验收通过，真机运行尚未完成。详见[发行记录](/docs/engineering/weapp-container/docs/public-sdk-release/)。固定在线演示的历史状态另见平台页；归档仍按版本化 lock 和随包许可证核验。

先使用发行中的编译消费者与模拟器检查路由、持久化、页面生命周期、文本输入、方向变化和 surface 恢复。Simulator 通过不代表已签署的真机产物、Metal 性能或特定设备回归通过；这些状态在验收证据中分别记录。
