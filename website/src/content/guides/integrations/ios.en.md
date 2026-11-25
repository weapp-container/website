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


The iOS SDK provides Swift Concurrency sessions, UIKit views, and Metal rendering surfaces. The minimum deployment target is iOS 16.0, and the simulator and physical device are locked to the architecture respectively.

<a id="requirements"></a>
<a id="1-安装-sdk"></a>
## 1. Install SDK

The public prerelease provides an iOS SDK archive with arm64 device, arm64 simulator and x86_64 simulator slices. It requires macOS, Xcode 27.2+ and iOS 16.0+. Download the [core prerelease archive](https://github.com/weapp-container/weapp-container/releases/download/runtime-v0.1.0-preview.7.1/ios-sdk-0.1.0-preview.7.1-ios-universal.tar.gz), verify its SHA-256 from the release page, extract it, and add the directory as a local Swift Package in Xcode with the **WeappContainer** product in the app target.

For CocoaPods, reference the included `WeappContainer.podspec` by local path in the Podfile. The standalone sdk-ios release is not published, and its fixed remote SwiftPM/CocoaPods URLs are unavailable. Maintainers rebuilding the SDK should follow the [maintainer source build guide](/en/docs/engineering/weapp-container/docs/sdk-source-build/).

Add the entire `hello-pack/` folder to the target as a resource, retaining its directory structure.

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

The iOS wrapper source is `0.1.0-preview.7.1`, licensed under Apache-2.0. The core prerelease provides an anonymously downloadable SDK tarball. The standalone `sdk-ios` GitHub release has not been published, and its pinned SwiftPM and CocoaPods archive URLs currently return 404. The archive can be integrated as a local Swift package. This remains a prerelease with no stable version. See the [release record](/en/docs/licensing/); device-target compilation, simulator interaction, and physical-device execution are recorded separately.

Start by checking routing, persistence, page lifecycle, text input, orientation changes, and surface restoration using the compiled consumer and simulator from the release. A Simulator pass does not represent a signed physical product, Metal performance, or specific device regression pass; these statuses are recorded separately in the Acceptance Evidence.
