---
id: "docs/engineering/weapp-container/examples/hosts/desktop/index"
title: "桌面原生表面烟雾"
section: "示例"
summary: "桌面原生表面烟雾。来自 weapp-container/weapp-container 的版本化工程说明。"
route: "/docs/engineering/weapp-container/examples/hosts/desktop/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "c4c0bd1dc6754d5e9a8de354c5651e756d751e39"
sourcePath: "examples/hosts/desktop/README.md"
---

<a id="desktop-native-surface-smoke"></a>
# 桌面原生表面烟雾

**简体中文** · [English](/en/docs/engineering/weapp-container/examples/hosts/desktop/index/)


此独立示例创建一个 `winit` 窗口，附加一个 `softbuffer::Surface`，呈现一个确定性的 2×2 RGBA 帧，并发出 JSON 报告。该示例旨在用于 macOS、Windows 和 Linux 机器，且具备可用的图形会话：

```bash
pnpm host:desktop:surface -- --out artifacts/desktop/native-window-surface.json
```

该报告记录了 `nativeSurface: true`，`presentedFrame: true`，像素 SHA-256 值和 `surfaceBackend: "softbuffer-raster"`。`gpuSurface` 保持为 `false`，因为软缓冲是一种 CPU 显示路径。空头环境被报告为 `blocked`，不应将其解释为 GPU 或设备通过。
