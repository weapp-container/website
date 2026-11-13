---
id: "docs/engineering/website/docs/devices"
title: "Web Presentation Equipment"
section: "Runtime and hosts"
summary: "Web Presentation Equipment. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/docs/devices/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "88b099619334a4fb751e7e9f089c6ee9d7ef60d5"
sourcePath: "docs/devices.en.md"
---

<a id="web-演示设备"></a>
# Web Presentation Equipment

[简体中文](/docs/engineering/website/docs/devices/) · **English**


For the verification scope of this round of full-screen and `hostLayout` changes, see [Duo full-screen acceptance record](/en/docs/engineering/website/docs/duo-fullscreen-verification/). [candidate9 History](/en/docs/engineering/website/docs/duo-verification/) retains its original candidate status and conclusions.

The equipment size is uniformly maintained at [`website/device-profiles.json`](https://github.com/weapp-container/website/blob/88b099619334a4fb751e7e9f089c6ee9d7ef60d5/website/device-profiles.json). The official website and iframe consume the same registry; after staging verifies the geometric structure and verified tags in both directions, it writes the registry into the hash asset closure. The source field is used to trace independent measurements, staging does not re-run the UIKit witness or reconcile private original records. The URL only accepts `scene`, `device`, `display`, `rotation`, where `rotation` is `0` or `90`, and cannot specify any runtime library, pack or permissions.

The default device is **the natural orientation of the unfolded iPhone Duo inner screen**: the entire screen after the actual Open operation is `951 × 669` pt, the direction is landscape, the safe content area is `867 × 635` pt, and the simulated DPR is `3`. The rotated inner screen is `669 × 951` pt and the safe content area is `669 × 835` pt. `0` here represents the real sampling starting attitude; it is not equal to a unified vertical screen, nor can it be derived by exchanging resolution axes.

Select the model through "Demo Device" on the official website; the Duo internal screen displays the "Fold Screen" button, and after switching to the external screen, the "Expand Screen" is displayed, juxtaposed with the "Rotate Screen". The current inner/outer screen and full-screen size are displayed above the preview. Folding changes only the display selection and preserves the rotation, session, cart, and orders. Controls cannot be triggered again while the switch is in progress.

| Device/Display | rotation 0 full screen/rendering window | rotation 90 full screen/rendering window | DPR |
| --- | --- | --- | --- |
| iPhone Duo internal screen | 951 × 669 / 951 × 669 | 669 × 951 / 669 × 951 | 3 |
| iPhone Duo external screen | 466 × 678 / 466 × 678 | 678 × 466 / 678 × 466 | 3 |
| iPhone 18 Pro | 402 × 874 / 402 × 874 | 874 × 402 / 874 × 402 | 3 |
| iPhone 18 Pro Max | 440 × 956 / 440 × 956 | 956 × 440 / 956 × 440 | 3 |
| iPhone 17 | 402 × 874 / 402 × 874 | 874 × 402 / 874 × 402 | 3 |
| Pixel 7 web preview | 412 × 839 / 412 × 839 | 863 × 360 / 863 × 360 | 2.625 |
| iPad mini (A17 Pro) | 744 × 1133 / 744 × 1133 | 1133 × 744 / 1133 × 744 | 2 |

<a id="测量来源与坐标"></a>
## Measurement source and coordinates

Apple data was sampled on 2026-11-06, using an independent UIKit witness compiled with Xcode 27.2 (27B52) and Swift 6.4.2. Only UIKit was imported and the container SDK was not imported. Perform real Open / Closed, Rotate Right operations through task-specific simulator and Device Hub. Duo uses iOS 27.2 (24B91016s), other iPhone uses iOS 27.2 (24B8117), iPad mini A17 Pro uses iOS 27.0 (24A434) which supports this model. Registry `source` records the source code and binary SHA-256 of the tool chain, runtime build and witness; the original measurements and screenshots are left in the private verification product.

- `width` / `height` are the whole screen points in `UIWindowScene.screen.coordinateSpace`; `orientation` comes from the real interface orientation.
- `safeArea` is `UIWindow.safeAreaInsets` for the current direction. It only serves as a registry raw sample record. The iframe covers the full screen from the screen origin, and the guest protects content and controls via `hostLayout.safeInsets` of the same window snapshot.
- `metricsSafeArea` is a six-field rectangle after converting the UIKit safe rectangle to `screen.fixedCoordinateSpace`; `screenFixed` records the dimensions of this coordinate space. It is passed into the runtime as `metrics.safeArea`, and the axis or mirror cannot be guessed according to the current horizontal and vertical screen.
- For example, the top of the current content of Duo internal screen rotation 90 is `82`, and the top of the fixed coordinate safety rectangle is `34`. The two belong to different coordinate spaces and cannot be replaced by each other. The inset of `84` pt on the right side of Duo's current direction is also from actual measurement.

Pixel 7 uses the installed Playwright **1.56.1** `Pixel 7` and `Pixel 7 landscape` two web content window presets, which do not sample the native Android safe zone. The two demonstration windows are `412 × 839` and `863 × 360`, and the horizontal screen is not the vertical screen size. Default screens `412 × 915` and `915 × 412` are only recorded in provenance in each direction; the demo treats the browser content window as a logical full screen, without imaginary status bar height or native insets. The interface is clearly labeled "Web Preview" and the test is directed against the installed version of the two descriptors.

These are simulator or browser preview records and cannot be used as proof of physical device installation, signature or physical device interaction verification. Real machine verification requires independent recording of device, system, build identity, and operating results.

The measurement of UIKit witness proves the registry source, the Web device acceptance proves the browser host behavior, and the native Showcase acceptance proves the corresponding native host behavior; the three are recorded separately and cannot replace each other. The native Duo interaction of this final candidate is subject to the independent running evidence of the candidate, and the unfinished acceptance items in `platforms/status.json` will continue to be retained.

The Duo's full surface, local safe area, `verticalBarEdge` and valid reserved areas have been reacquired using a standalone witness linked to the iOS 27.2 SDK. The actual physical sidebar edge of the natural orientation of the external screen and the internal screen is on the right side, and when the internal screen is rotated 90°, there is no sidebar; these states are stored directly in the registry and are not inferred by model or orientation at runtime. The occlusion after the external screen is rotated is located on the lower right side, and the sidebar control avoids this effective area. There is no active folding area when fully unfolded, so no crease gaps will remain. Partially collapsed areas are provided by native dynamic snapshots; web pages only provide registered expanded/collapsed external screens and rotation states.

<a id="生命周期与渲染"></a>
## lifecycle and rendering

When switching device models or demonstration scenarios, the host first sends a shutdown request with version and request ID, and then creates a new owner after receiving the actual Worker shutdown receipt of the current iframe. Timeouts do not silently replace an indeterminate owner. Folding and rotating retain the same session: the host first pauses the interaction and adjusts the outer frame; the iframe calls `setWindowMetrics` to install the input fence and then adjusts the complete internal rendering window and content layout. Only after the matching new viewport has been rendered, the metrics fence is opened, and input is available, does the host update the confirmed device selection and URL and resume interaction. If it fails, an error is displayed and the demo needs to be reloaded.

The message simultaneously verifies origin, iframe Window, protocol version and request ID. Expired receipts, receipts from old owners, and duplicate requests will not commit subsequent transactions. Input is suspended during the switch, and shopping carts and orders continue to use the original state bridge.

Separate simulated device DPR from actual Canvas rendering density: Window API reports registry DPR, `renderScale: 'auto'` is valued at the actual browser density and capped at `2`. The outline is scaled to the available width and height, with no minimum scaling set; this display scaling does not change the guest's logical window.

Omitted values ​​for URLs always fall back to the natural orientation of the Duo's expanded inner screen. Use `replaceState` to update links after device and scene submission to refresh replayable selections; no additional history entries are created for each fold. Leaving the page closes the guest owner; if the browser restores the historical page via BFCache, the host refreshes the page and creates a new owner from the URL and persistent state.

The rendering viewport now covers the entire screen, consistent with the screen size. `hostLayout` (version 1) separately records the current surface's local safe margins, physical sidebar edges, and effective occlusion/collapse areas; it is independent of the old fixed-coordinate `safeArea`. Business content and controls are avoided using this snapshot, while the background remains fully covered. Device switching confirmation must match the exact metrics fence revision, the complete submitted window snapshot and the new screen, and cannot only compare the width and height.


<a id="页面使用-hostlayout"></a>
## Page uses hostLayout

`wx.getWindowInfo().hostLayout` is a container extension field. The coordinate origin of version 1 is the upper left corner of the actual rendered View, and the unit is logical points; the local coordinates of the View are still used when embedding the window. It has different semantics than fixed-coordinate `safeArea`: the page cannot directly deduce the local safe margin from the latter, nor can it deduct the same safe zone repeatedly in the host and the page.

```js
// wx.getWindowInfo() 的 hostLayout 示例；数值以当前宿主快照为准。
const exampleHostLayout = {
  version: 1,
  safeInsets: { top: 0, right: 84, bottom: 34, left: 0 },
  verticalBarEdge: 'right',
  reservedRegions: [
    { id: 'occlusion:0', kind: 'occlusion', x: 867, y: 0, width: 84, height: 124 }
  ]
}
```

- `safeInsets` protects content and clickable controls; the background and CanvasKit rendering surface continue to cover the full `windowWidth × windowHeight`.
- `verticalBarEdge` is `left`, `right`, or `none` that has been resolved to the physical direction. The page arranges side navigation or horizontal navigation according to this value, and cannot be mirrored again by device name, horizontal and vertical screen or RTL.
- `reservedRegions` contains only the currently valid `occlusion` or `division` rectangle, with the platform already factoring in the avoidance margins. The page separates the available content columns accordingly and selects the entire available area for the popup; it does not expand the rectangle again, nor does it retain the disappeared crease gap after it is fully expanded. The region ID is only used for the current snapshot and is not used as a permanent identifier across poses.

Synchronize the query window when the page is first loaded, read the new snapshot in the size and layout callbacks, and log out the layout monitor when unloading:

```js
Page({
  data: { windowWidth: 0, windowHeight: 0, hostLayout: null },
  onLoad() {
    this.layoutChanged = () => this.readWindow()
    wx.onHostLayoutChange(this.layoutChanged)
    this.readWindow()
  },
  onResize() { this.readWindow() },
  onUnload() { wx.offHostLayoutChange(this.layoutChanged) },
  readWindow() {
    const info = wx.getWindowInfo()
    this.setData({
      windowWidth: info.windowWidth,
      windowHeight: info.windowHeight,
      hostLayout: info.hostLayout ?? null,
    })
  },
})
```

The argument to `wx.onHostLayoutChange` is `{ hostLayout }`; when the extension is removed, it is `{ hostLayout: null }`. When the window size remains unchanged but the sidebar, occlusion or folding area changes, only the layout event is triggered and `onResize` is not accidentally sent. The window information is updated atomically first, and the synchronous query in the callback immediately reads the new snapshot. Access parties should still handle legacy hosts with missing extension fields; missing values ​​do not indicate that a zero safety margin has been observed.

These changes will also revoke the old touch and presence permissions; the current session will not resume interaction until the new matching screen is presented and confirmed. The business page does not save the old layout coordinates and continue to deliver input, nor does it present the read-only collection result authorization.

iOS 27.1+ Collected from the actual View's `traitCollection.verticalBarEdge`, `reservedRegions(kind:)`, `safeAreaInsets`, and `traitCollection.displayScale`; leading/trailing is resolved to physical edges in the host in the current layout direction. iOS There are still compatible safe zone collection paths starting from 16. Public iOS `captureWindowMetrics()` Returns the same full snapshot that is not mounted, has no valid layout, or returns `nil` during unbinding; it does not create a runtime, advance layout observation identities, or change rendering permissions. Flutter iOS uses this collection entry and keeps request owner, cancellation and expiration result checks.

The scaling of the official website frame is constrained by the available width and viewport height respectively, and then the actual scaled frame height is used to set the stage occupancy. The stage height is no longer used as the available height for zoom calculations to avoid the `ResizeObserver` feedback loop that creates upper and lower gaps. The preview scaling is independent of the simulated DPR and Canvas backing-store magnification.
