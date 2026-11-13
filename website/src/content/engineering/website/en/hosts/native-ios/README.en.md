---
id: "docs/engineering/website/hosts/native-ios/index"
title: "Swift/UIKit host"
section: "Project and maintenance"
summary: "Swift/UIKit host. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/hosts/native-ios/index/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "df46170e0d94fdcf52b0153f689870d34eaeb190"
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
