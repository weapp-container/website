---
id: "docs/engineering/website/hosts/native-ios/index"
title: "Swift/UIKit host"
section: "Project and maintenance"
summary: "Swift/UIKit host. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/hosts/native-ios/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "88b099619334a4fb751e7e9f089c6ee9d7ef60d5"
sourcePath: "hosts/native-ios/README.en.md"
---

<a id="swiftuikit-主机"></a>
# Swift/UIKit host

[简体中文](/docs/engineering/website/hosts/native-ios/index/) · **English**


The app consumes the exact installed Swift package in `.runtime/sdk/ios`, embeds
the native Metal view and owns UIKit text dialogs, state persistence and async
close. `node tools/native-consumer-build.mjs --platform ios` generates its Xcode
project and compiles for the simulator without signing. The result is a compile
check; device IPA signing and actual simulator/device execution are independent.
