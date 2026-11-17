---
id: "integrations/harmony"
title: "HarmonyOS example"
section: "Platform integrations"
summary: "Existing ArkTS example and its actual build, installation, and runtime status."
route: "/docs/integrations/harmony/"
locale: "en"
---

HarmonyOS / ArkTS

<a id="harmonyos-示例"></a>
# HarmonyOS Example

[简体中文](harmony.md) · **English**


The public repositories include an ArkTS Showcase host and preview build scripts. This is an example host; no independent stable HarmonyOS SDK wrapper or ArkTS consumer package is currently published.

<a id="当前记录的状态"></a>
## Current record status

| Stage | Status |
| --- | --- |
| build | passed |
| installation | not-run |
| run | not-run |
| signed | unsigned |

**Build is not device verification**

The recorded ArkTS release HAP build contains three verified native libraries. Device installation and execution were not tested. The build result establishes neither device startup and interaction nor GPU presentation or release signing.

<a id="source"></a>
<a id="源码和工具链"></a>
## Source and toolchain

The ArkTS application source lives in `hosts/harmony/` in the public website repository. It requires the HarmonyOS SDK, Hvigor, and the target toolchain. The standalone Native Showcase build scripts require a matching runtime, fixed pack, and the relevant distribution license. Check new source builds and historical prebuilt archives against their respective licenses before signing and testing on a device.

The webpage does not provide HAP downloads, HarmonyOS native runtime packages, device support matrix, or platform API lists. Before using a prebuilt archive, check its license, target API level, architecture, and signing requirements.

<a id="next"></a>
<a id="如何贡献可验证状态"></a>
## How to contribute verifiable status

After deploying the ArkTS app, record the SDK/runtime archive pins, Hvigor/SDK version, device model and API level, signature mode, and startup/interaction/shutdown results and original execution receipt. Update build, install, runtime, and signing respectively, and do not extrapolate one stage mark to other stages.

[View current platform verification status](/en/docs/platforms/)
