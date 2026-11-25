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


Prepare a mini-program package, put the SDK view in the application, and then load the package. Existing mini-programs can continue to use their own development tools. Start with a published SDK package or prebuilt archive for your platform. A source checkout is not required for normal integration.

<a id="prepare-source"></a>
<a id="1-准备一个测试包"></a>
## 1. Prepare a test package

Use the published Contract npm package to create an independent test package. Install Node.js 24.x and run this in your application project:

```bash
npm install --save-dev @weapp-container/sdk-contract@0.1.0-preview.7.1
node --input-type=module -e "import { makeAcceptancePack } from '@weapp-container/sdk-contract/fixtures'; makeAcceptancePack('./hello-pack')"
```

The generated `hello-pack/` contains `manifest.json` and `blobs/sha256/`. Its sample page provides click count, scrolling and host messaging. The Contract package contains protocol types and test tools, not a native runtime library.

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

**Preview release status**

Generating the test package only prepares the input. Loading it requires the SDK and matching runtime library for your platform. Use the published dependency or prebuilt archive listed in each platform guide. Platforms without a usable public release are marked there. The website demo accepts only fixed packages and cannot load this test package. See [Licensing, Downloading and Distribution](/en/docs/licensing/) and [Platform Status](/en/docs/platforms/).

<a id="下一步"></a>
## Next steps

- [Package your own mini-program and configure capabilities](/en/docs/pack/)
- [Navigate and send and receive messages via SDK](/en/docs/sdk-api/)
- [Query Mini Program API and Component Compatibility](/en/docs/api/)
- [Troubleshooting when loading fails](/en/docs/troubleshooting/)
