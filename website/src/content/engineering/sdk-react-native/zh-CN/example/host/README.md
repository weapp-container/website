---
id: "docs/engineering/sdk-react-native/example/host/index"
title: "原生宿主路由和滚动消费者"
section: "项目与维护"
summary: "原生宿主路由和滚动消费者。来自 weapp-container/sdk-react-native 的版本化工程说明。"
route: "/docs/engineering/sdk-react-native/example/host/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/sdk-react-native"
sourceCommit: "c7f126867d565099233295b072b2a41b1be10ec0"
sourcePath: "example/host/README.md"
---

<a id="native-host-routing-and-scrolling-consumer"></a>
# 原生宿主路由和滚动消费者

**简体中文** · [English](/en/docs/engineering/sdk-react-native/example/host/index/)


从独立 SDK 根目录运行；可移植测试 fixture 由包含的源码编写：

```sh
node tools/create-host-consumer.mjs --package /absolute/path/sdk.tgz --out /absolute/path/new-host-consumer
node tools/host-smoke.mjs --consumer /absolute/path/new-host-consumer --platform ios --device EXISTING_SIMULATOR_ID --out FRESH_EVIDENCE_DIRECTORY
```

选择 Android，使用 `--platform android` 和一个现有的模拟器/设备 ID。测试框架验证父级路由、滚动所有权和会话清理。源码导出未运行硬件测试；准备过程不构成验证。
