---
id: "docs/engineering/organization/profile/index"
title: "Weapp Container"
section: "Project and maintenance"
summary: "Weapp Container. Versioned engineering reference from weapp-container/.github."
route: "/docs/engineering/organization/profile/index/"
locale: "en"
sourceRepository: "weapp-container/.github"
sourceCommit: "fdab9ba4e4c69c84d8d1b5096c945da994745f34"
sourcePath: "profile/README.en.md"
---

<p align="center"><img src="/documentation/e9cc10702f6ab5856a0b21dfa0f1f7f77aaecceb8b2c914a39b079f53fae5c84.svg" width="96" height="96" alt="Weapp Container" /></p>

<a id="从工程到应用的闭环"></a>
<a id="开放与许可"></a>
# Weapp Container

[简体中文](/docs/engineering/organization/profile/index/) · **English**

Embed mini-programs in your own applications. Weapp Container provides a public Rust runtime, standalone portable pack tooling, a development simulator, and host SDKs. Start with native mini-program sources or an existing framework build. weapp-vite is an optional upstream build tool.

[Documentation](https://container.weapp.dev/en/docs/) · [Live demo](https://container.weapp.dev/en/demo/) · [Core source](/en/docs/engineering/weapp-container/index/) · [Platform status](https://container.weapp.dev/en/docs/platforms/)

<a id="开始使用"></a>
## Getting started

Create a standalone test pack without installing a mini-program framework or npm dependencies:

```sh
git clone https://github.com/weapp-container/sdk-contract.git
cd sdk-contract
node fixtures/make-acceptance-pack.mjs --out ../hello-pack
```

Choose a host, build the matching runtime from public source, mount its SDK view, and load `hello-pack/`. Package your own native mini-program with the [standalone packer](https://container.weapp.dev/en/docs/pack/). The browser demonstration runs a fixed pack and does not accept arbitrary uploads.

<a id="选择接入入口"></a>
## Integrations

| Host | Repository | Contents |
| --- | --- | --- |
| Android | [sdk-android](/en/docs/engineering/sdk-android/index/) | Kotlin sessions, native views, and messaging |
| iOS | [sdk-ios](/en/docs/engineering/sdk-ios/index/) | Swift sessions, UIKit, and SwiftUI |
| C++ Desktop | [sdk-desktop](/en/docs/engineering/sdk-desktop/index/) | C/C++ sessions, native child views, and presenters |
| Flutter | [sdk-flutter](/en/docs/engineering/sdk-flutter/index/) | Dart controllers, widgets, and native adapters |
| React Native | [sdk-react-native](/en/docs/engineering/sdk-react-native/index/) | Fabric views, controllers, and TurboModules |
| Custom hosts and tools | [sdk-contract](/en/docs/engineering/sdk-contract/index/) | Shared C ABI, types, and protocols |
| Website and examples | [website](/en/docs/engineering/website/index/) | Chinese and English documentation and a fixed Web demo |

The project is in **preview**. Build, installation, runtime, device, and GPU acceptance are recorded separately. Translation adds no platform support. HarmonyOS has an existing host example with its own status; it is not a separate public SDK. APIs are grouped into 29 capability groups. The 115 defaults do not imply host implementation, and 12 platform coverage gaps remain explicit.

<a id="开发与贡献"></a>
## Development

Use the [core README](/en/docs/engineering/weapp-container/index/) to prepare Node.js 24.x, pnpm, Rust, and platform toolchains. Report issues in the relevant repository. Follow the [security policy](/en/docs/engineering/weapp-container/security/) for vulnerabilities and the [contribution guide](/en/docs/engineering/weapp-container/contributing/) before submitting changes.

<a id="许可与历史"></a>
## License and history

Project source is published under Apache-2.0, with selected core crates retaining MIT OR Apache-2.0. Third-party components keep their own licenses. The LICENSE, NOTICE, and RUNTIME-LICENSE included with each repository or copy govern that copy.

Historical runtime archives retain their original terms and hashes. Public source does not relicense those binaries or guarantee old download pins remain available. Prefer building matching public source; see the [migration documentation](https://container.weapp.dev/en/docs/engineering/weapp-container/docs/runtime-artifacts-migration/) for historical archive boundaries.
