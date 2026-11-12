<p align="center"><img src="assets/weapp-container.svg" width="96" height="96" alt="Weapp Container" /></p>

<a id="从工程到应用的闭环"></a>
<a id="开放与许可"></a>
# Weapp Container

[简体中文](README.md) · **English**

Embed mini-programs in your own applications. Weapp Container provides a public Rust runtime, standalone portable pack tooling, a development simulator, and host SDKs. Start with native mini-program sources or an existing framework build. weapp-vite is an optional upstream build tool.

[Documentation](https://container.weapp.dev/en/docs/) · [Live demo](https://container.weapp.dev/en/demo/) · [Core source](https://github.com/weapp-container/weapp-container/blob/main/README.en.md) · [Platform status](https://container.weapp.dev/en/docs/platforms/)

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
| Android | [sdk-android](https://github.com/weapp-container/sdk-android/blob/main/README.en.md) | Kotlin sessions, native views, and messaging |
| iOS | [sdk-ios](https://github.com/weapp-container/sdk-ios/blob/main/README.en.md) | Swift sessions, UIKit, and SwiftUI |
| C++ Desktop | [sdk-desktop](https://github.com/weapp-container/sdk-desktop/blob/main/README.en.md) | C/C++ sessions, native child views, and presenters |
| Flutter | [sdk-flutter](https://github.com/weapp-container/sdk-flutter/blob/main/README.en.md) | Dart controllers, widgets, and native adapters |
| React Native | [sdk-react-native](https://github.com/weapp-container/sdk-react-native/blob/main/README.en.md) | Fabric views, controllers, and TurboModules |
| Custom hosts and tools | [sdk-contract](https://github.com/weapp-container/sdk-contract/blob/main/README.en.md) | Shared C ABI, types, and protocols |
| Website and examples | [website](https://github.com/weapp-container/website/blob/main/README.en.md) | Chinese and English documentation and a fixed Web demo |

The project is in **preview**. Build, installation, runtime, device, and GPU acceptance are recorded separately. Translation adds no platform support. HarmonyOS has an existing host example with its own status; it is not a separate public SDK. APIs are grouped into 29 capability groups. The 115 defaults do not imply host implementation, and 12 platform coverage gaps remain explicit.

<a id="开发与贡献"></a>
## Development

Use the [core README](https://github.com/weapp-container/weapp-container/blob/main/README.en.md) to prepare Node.js 24.x, pnpm, Rust, and platform toolchains. Report issues in the relevant repository. Follow the [security policy](https://github.com/weapp-container/weapp-container/blob/main/SECURITY.en.md) for vulnerabilities and the [contribution guide](https://github.com/weapp-container/weapp-container/blob/main/CONTRIBUTING.en.md) before submitting changes.

<a id="许可与历史"></a>
## License and history

Project source is published under Apache-2.0, with selected core crates retaining MIT OR Apache-2.0. Third-party components keep their own licenses. The LICENSE, NOTICE, and RUNTIME-LICENSE included with each repository or copy govern that copy.

Historical runtime archives retain their original terms and hashes. Public source does not relicense those binaries or guarantee old download pins remain available. Prefer building matching public source; see the [migration documentation](https://container.weapp.dev/en/docs/engineering/weapp-container/docs/runtime-artifacts-migration/) for historical archive boundaries.
