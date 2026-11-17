---
id: "pack"
title: "Configuration and portable packs"
section: "Get started"
summary: "Package native mini-programs or existing builds, configure capabilities, and verify resources."
route: "/docs/pack/"
locale: "en"
---

PACKAGES

<a id="配置与-portable-pack"></a>
# Configuration and portable pack

[简体中文](pack.md) · **English**


The portable pack is a mini-program package loaded by the SDK. Keep the original tools during development, and convert the mini-program build output into this format before distribution.

<a id="portable-pack"></a>
<a id="包里有什么"></a>
## Pack contents

```text
hello-pack/
├── manifest.json
└── blobs/
    └── sha256/
        └── <内容哈希>
```

`manifest.json` records pages, entries, capabilities and content root hashes, `blobs/` saves code, templates, styles and resources. Give the entire directory to the SDK, don't just copy the manifest, and don't pass the development server address directly to `load`.

<a id="test-pack"></a>
<a id="先试一个现成示例"></a>
## Try a ready-made example first

[Quick Start](/en/docs/start/#prepare-source) provides a test package generation command with zero npm dependencies. When you only want to verify host integration, use this package first.

<a id="own-miniapp"></a>
<a id="打包现有小程序"></a>
## Package existing mini-programs

The packaging tool independently reads the WeChat mini-program directory and requires `app.json`, JS/WXML/WXSS of pages and components, and their reference resources. The native mini-program directory can be imported directly; other frameworks first use their own build commands to generate these files. Weapp Container access does not require changing the project framework.

The tool is currently provided with the [Core Source Code Repository](https://github.com/weapp-container/weapp-container/tree/main/tools/container-manifest), and there is no independent public npm installation command. Execute in the root directory of the repository:

```bash
pnpm install --frozen-lockfile
node tools/container-manifest/bin/container-pack.mjs \
  /absolute/path/weapp-output \
  --out /absolute/path/portable-pack
```

Installation only requires the tool dependencies of this repository, and there is no need to initialize the `vendor/weapp-vite` submodule. If there is TypeScript or framework-specific syntax in the input, it should be compiled into a mini-program build output first. The compatibility range of specific templates, plug-ins and APIs still needs to be accepted according to [Component Compatibility](/en/docs/components/) and [API Record](/en/docs/api/).
The command checks dependency closures, transforms templates and styles, generates content hashes, and outputs `manifest.json`, `blobs/`, `capability-matrix.json`, and `diagnostics.json`. Handle errors in diagnostics first, and then put the complete output into the host resource directory.

**Why does the v1 manifest still use `weapp-vite` in `compiler.name`?**

This is a historical format identifier retained by the v1 schema and is also used by the standalone test package. It does not require applications to use that build framework. Do not manually modify the generated identity fields as this will break the schema or content hash validation.

<a id="validation"></a>
<a id="加载前校验"></a>
## Verification before loading

- Check that the format version and runtime/ABI version matches in the manifest.
- Recalculate manifest and blob SHA-256, compare integrity identity by locking pack root.
- Check that all resources are in the pack root directory, rejecting path traversal, symbolic links, unlocked binaries and partial decompression.
- Check the pack root and capability ceiling allowed in the release policy.
- Keep source and construction evidence for the final directory and its hash lock respectively.

<a id="capabilities"></a>
<a id="能力和权限协商"></a>
## Capability and permission negotiation

When you need to adjust the capabilities of a package declaration, create a JSON file and pass it to the `--capabilities` parameter of the package command. For example:

```json
{
  "wx.getStorage": "partial",
  "wx.request": "unsupported"
}
```
```bash
node tools/container-manifest/bin/container-pack.mjs \
  /absolute/path/weapp-output \
  --out /absolute/path/portable-pack \
  --capabilities /absolute/path/capabilities.json
```

The file only overrides the capabilities listed and uses tool defaults for the rest. Capabilities are divided into `full`, `partial`, and `unsupported`; the lower level of the package declaration negotiated with the host provider determines the callable scope, and `wx.canIUse` reports the result of the negotiation. Declaring capabilities does not automatically provide system permissions or host implementations.

<a id="full-vs-partial"></a>
<a id="完整与部分支持"></a>
## Full and partial support

`partial` indicates that the bridge contract or some behaviors exist, but the parameter semantics, host differences, device verification, or WeChat comparison evidence are still limited. See the difference, coverage, and conformance fields of the specific API group for details. Device system capabilities, login, payment, network and file authorization all require host provider and application permission processes.

<a id="private-demo"></a>
<a id="受限在线演示"></a>
## Restricted online demo

container.weapp.dev is released with fixed pack and restricted-showcase strategy compiled into the runtime. The website only provides the same-origin runtime files of the demo, and does not accept any application packages uploaded by visitors or pointed to their own servers, nor does it issue runtime or SDK download credentials.
