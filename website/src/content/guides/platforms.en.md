---
id: "platforms"
title: "Platform status and boundaries"
section: "Releases and support"
summary: "Build, installation, runtime, and signing results by target."
route: "/docs/platforms/"
locale: "en"
---

PLATFORMS

<a id="平台状态与支持边界"></a>
# Platform status and support boundaries

[简体中文](platforms.md) · **English**


Build, install, run and release signatures are verified separately. Only independent evidence is presented here, and no markers from one stage are extrapolated to another stage.

<a id="当前平台矩阵"></a>
## Current platform matrix

| Platform | Architecture | Build | Installation | Runtime | Signing |
| --- | --- | --- | --- | --- | --- |
| [Web](/en/docs/integrations/web/) | WASM / Dedicated Worker | Passed | Not applicable | Passed | Not applicable |
| [Android](/en/docs/integrations/android/) | arm64-v8a / x86_64 | Passed | Emulator verified | Emulator verified | Release signing verified |
| [iOS](/en/docs/integrations/ios/) | arm64 device / arm64 + x86_64 simulator | Passed | Simulator verified | Simulator verified | Simulator build unsigned |
| [HarmonyOS](/en/docs/integrations/harmony/) | arm64 | Passed | Not run | Not run | Unsigned |
| [macOS](/en/docs/integrations/desktop/) | arm64 / x86_64 | Passed | Local installation verified | Desktop execution verified | Unsigned |
| [Windows](/en/docs/integrations/desktop/) | x86_64 | Not verified | Not run | Not run | Unsigned |
| [Linux](/en/docs/integrations/desktop/) | x86_64 | Passed | Runner bundle verified | Partial | Not applicable |

Recorded on 2026-11-06. This table reflects the versioned platform snapshot. Check its source commit and each platform receipt for the exact example and runtime covered.

<a id="limitations"></a>
<a id="重要限制"></a>
## Known limitations

- **HarmonyOS:** ArkTS Release HAP build documented; installation and device operation not yet documented.
- **Windows:** Desktop SDK consumer evidence does not represent complete passing of the native Showcase app.
- **Linux:** Runner startup and screen recording do not mean that all shopping-demo or text interactions or Flutter ABI are fully passed.
- **iOS:** Simulator and physical device belong to different evidence; candidates lacking Apple distribution signature cannot be directly extrapolated to official distribution.
- **Mobile ABI:** Building containers, simulators and arm64 physical device execution need to be verified target by target, and the architecture is not assumed to be completely symmetrical.

<a id="acceptance"></a>
<a id="每个目标应该如何验收"></a>
## Validate a target

After obtaining the matching artifact pin, verify archive/path/hash on the target under test, and then compile the independent consumer separately. After the application is installed, check the native graphics surface, valid first frame, click/scroll, routing, background pause/resume, and storage flush/ reopen and explicitly close. Signatures, notarizations, system permissions and actual device models require additional markings. Any "passed" should be associated with the runtime version, pack root, and immutable receipt.

[Open the simplified version of the platform overview](/en/platforms/)
