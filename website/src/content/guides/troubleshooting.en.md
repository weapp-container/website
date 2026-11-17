---
id: "troubleshooting"
title: "Troubleshooting"
section: "Releases and support"
summary: "Diagnose manifests, hashes, lifecycle, layout, and rendering problems."
route: "/docs/troubleshooting/"
locale: "en"
---

TROUBLESHOOTING

<a id="故障排查"></a>
# Troubleshooting

[简体中文](troubleshooting.md) · **English**


Prioritize the use of clear error codes, receipts, and reproducible packs before locating host or runtime behavior.

<a id="version-mismatch"></a>
<a id="下载或准备时出现版本abi-不匹配"></a>
## Version or ABI mismatch during download or preparation

First read the SDK, runtime distribution and current lock version, ABI, platform, architecture, size, SHA-256 and profile. Current SDK source and the default versioned public lock both use preview.7.0; unversioned old locks remain for historical compatibility. Custom manifests must match the source and archive versions. Do not rewrite locks to match older binaries, and do not copy unidentified native libraries from other machines.

<a id="integrity-failed"></a>
<a id="pack-文件完整性失败"></a>
## Pack integrity verification fails

Check the schema of `manifest.json`, the unique root hash, the full SHA-256 of each content blob, and that all resources are in the pack root. Avoid subpackaging, directory traversal, missing vendors, file size truncation, and dynamic overwriting of resources. Rebuild a complete pack before installing it. Do not retry loading partial directories that have failed.

<a id="unsupported-capability"></a>
<a id="unsupported-capability-或-caniuse-返回-false"></a>
## unsupported capability or canIUse returns false

Review pack manifest request values, runtime policy ceiling, SDK negotiated capabilities, host providers, and system permissions. The capability default value is not a platform guarantee. Please compare the [Default Capabilities](/en/docs/api/capability-defaults/) and the specific [API Group](/en/docs/api/) pages to prioritize structured `ERR_UNSUPPORTED_CAPABILITY` and permission errors.

<a id="blank-view"></a>
<a id="view-为空报-ready-后没有画面"></a>
## Blank view after the ready event

Confirm that the View has been added to the actual window, the width and height are positive, the density/pixel ratio is not 0, and the system graphics context is available. Native view events are logged separately from runtime ready; check first frame/present completion and SDK error events. Android and iOS/Desktop each have clear errors when GPU backend fails, and CPU fallback cannot be automatically inferred.

<a id="lifecycle"></a>
<a id="切后台恢复后事件停止"></a>
## Events stop after backgrounding and resuming

Pass the Activity/scene lifecycle into `setForeground`. Re-mount the View after retaining the original session owner. Do not create a concurrent writer with the same account storage key due to temporary unmount. Check storage write acknowledgment, canceled host calls, and View retirement receipt.

<a id="render-input"></a>
<a id="程序可以操作但点击输入失败"></a>
## Rendering works but taps or text input fail

Verify that the system uses the real bounds of the container for the guest's touch coordinates and does not use the full-screen device geometry. The text editing bridge is not fully IME/accessibility compatible; there are preview limitations for the native wrapper's Native Text, long press, and multi-finger gestures. Compare the on-screen editor and app-specific bridge of the same device, and then query the restrictions of each host.

<a id="attach-diagnostics"></a>
<a id="提取可用诊断信息"></a>
## Collect diagnostics

- Keep exception code/message, SDK version, ABI, OS/ architecture, pack root and profile.
- Attached are the original artifact lock hash, standalone consumer build command and complete exit code.
- Host errors must distinguish between input validation, permission denial, engine execution, GPU rendering, persistence and explicit shutdown.
- Delete token, device account, private source path and user data before sharing to issue or work order.
