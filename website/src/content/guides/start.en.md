---
id: "start"
title: "Quick start"
section: "Get started"
summary: "Create an independent test pack, choose an SDK, mount a view, and load the pack."
route: "/docs/start/"
locale: "en"
---

GET STARTED

<a id="快速开始"></a>
# Quick Start

[简体中文](start.md) · **English**


Prepare a mini-program package, put the SDK view in the application, and then load the package. Existing mini-programs can continue to use their own development tools.

<a id="prepare-source"></a>
<a id="1-准备一个测试包"></a>
## 1. Prepare a test package

Start with the independent fixture to verify integration. Install Node.js 24.x and run these three commands. No npm dependencies or mini-program build framework are required.

```bash
git clone https://github.com/weapp-container/sdk-contract.git
cd sdk-contract
node fixtures/make-acceptance-pack.mjs --out ../hello-pack
```

The generated `hello-pack/` contains `manifest.json` and `blobs/sha256/`. The sample page provides click count, scrolling and host messages, suitable for checking whether the SDK is connected.

Already have your own mini-program? See [Packaging existing mini-programs](/en/docs/pack/#own-miniapp). The native JS/WXML/WXSS directory can be directly used as packaging input; when using TypeScript, Vue or React, first use existing tools to generate mini-program products.

<a id="choose-host"></a>
<a id="2-把-sdk-加到应用"></a>
## 2. Add SDK to the application

Select a guide by the language or framework your app uses. Each platform loads the same portable pack, and the platform page will explain where to install the SDK and place `hello-pack/`.

- [Android: Kotlin Session + Native View](/en/docs/integrations/android/)
- [iOS: Swift Session + UIKit](/en/docs/integrations/ios/)
- [Desktop: C++ Session + Native Subview](/en/docs/integrations/desktop/)
- [Flutter: Controller + Widget](/en/docs/integrations/flutter/)
- [React Native: Controller + Fabric View](/en/docs/integrations/react-native/)

<a id="create-session"></a>
<a id="3-挂载视图加载包"></a>
## 3. Mount the view and load the package

1. Create a Session or Controller and register the required host methods.
2. Put the SDK view into the application layout and provide clear width and height.
3. Call `load` of the platform SDK and pass in the package or local package directory in the application resource.

The platform guides above contain integration examples. Keep the session in a stable page or route owner across UI renders. Report foreground and background transitions. Before disposing of the owner, await `flushStorage` and asynchronous shutdown.

**Using the current preview**

The successful generation of the test package only means that the input is ready. Actual loading requires a matching version of the runtime library. The current source code can be built from the public core repository without historical archive credentials. For details, see [Build from source](/en/docs/engineering/weapp-container/docs/sdk-source-build/). Permissions and licenses for existing precompiled archives are processed according to their respective releases; the online demo of the website only allows fixed packages and cannot be used to load the test packages generated here. See [Licensing, Downloading and Distribution](/en/docs/licensing/) and [Platform Status](/en/docs/platforms/) for details.

<a id="下一步"></a>
## Next steps

- [Package your own mini-program and configure capabilities](/en/docs/pack/)
- [Navigate and send and receive messages via SDK](/en/docs/sdk-api/)
- [Query Mini Program API and Component Compatibility](/en/docs/api/)
- [Troubleshooting when loading fails](/en/docs/troubleshooting/)
