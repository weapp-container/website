---
id: "integrations/ios"
title: "iOS"
section: "Platform integrations"
summary: "Integrate Swift sessions and UIKit views."
route: "/docs/integrations/ios/"
locale: "en"
---

iOS / Swift

<a id="ios-sdk-接入"></a>
# iOS SDK integration

[简体中文](ios.md) · **English**


The iOS SDK provides Swift Concurrency sessionss, UIKit views, and Metal rendering surfaces. The minimum deployment target is iOS 16.0, and the simulator and physical device are locked to the architecture respectively.

<a id="requirements"></a>
<a id="1-安装-sdk"></a>
## 1. Install SDK

The current release requires macOS, Xcode 27.2+ and the iOS 27.1+ compilation SDK; the deployment minimum remains iOS 16.0. The runtime should contain arm64 device, arm64 simulator and x86_64 simulator slices. Actual distribution can generate Swift Package or CocoaPods consumption directory; the framework license and third-party notices are retained with the package.

Execute in the clean checkout root directory of the public core repository. For the complete environment, native library slices and licensing steps, see [Build from source](/en/docs/engineering/weapp-container/docs/sdk-source-build/).

```bash
pnpm sdk:build:ios -- --install-framework
```

Add the generated `artifacts/sdk/ios/WeappContainer` as a local Swift Package in Xcode, and add the **WeappContainer** product to the application target. Add the entire `hello-pack/` folder to the target as a resource, retaining its directory structure.

<a id="create-session"></a>
<a id="2-挂载-uikit-视图并加载"></a>
## 2. Mount the UIKit view and load it

`WeappContainerSession` is managed by the main actor. The session configuration determines stable storage key or memory-only storage. Keep a reference to the UIView and start waiting for loading after the actual UIKit layout.

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

This function is called after the parent controller has been displayed and has a valid size; `packURL` can be taken as `Bundle.main.url(forResource: "hello-pack", withExtension: nil)`, and the resource does not exist first. The page owner holds the session with the child controller and waits for `flushStorage()` and `close()` before closing. For complete examples, see [iOS SDK README](https://github.com/weapp-container/sdk-ios/blob/main/README.en.md).

<a id="events-host"></a>
<a id="事件和宿主方法"></a>
## Events and Host Methods

Set `session.onEvent` to receive ready, navigation, chrome, message, error and closed events. Host capabilities can be registered through `registerHostMethod(_:handler:)` before load; the handler will receive `WeappJSON` and return `WeappJSON`. Explicitly report user authorization results, cancellation operations and failures, and do not directly wrap Objective-C/native errors into success JSON.

<a id="validate"></a>
<a id="模拟器和设备验收"></a>
## Simulator and equipment acceptance

**Version and Release Status**

The iOS wrapper source is `0.1.0-preview.7.0`, licensed under Apache-2.0. GitHub prereleases and public CocoaPods Specs are available. Public SwiftPM consumption, device-target compilation and arm64 simulator interaction acceptance passed; physical-device execution is incomplete. See the [release record](/en/docs/engineering/weapp-container/docs/public-sdk-release/). The platform page separately retains the fixed-demo history; verify archives against versioned locks and shipped licenses.

Start by checking routing, persistence, page lifecycle, text input, orientation changes, and surface restoration using the compiled consumer and simulator from the release. A Simulator pass does not represent a signed physical product, Metal performance, or specific device regression pass; these statuses are recorded separately in the Acceptance Evidence.
