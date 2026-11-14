---
id: "docs/engineering/weapp-container/examples/apps/modern-view-app/index"
title: "Modern synchronous View example"
section: "Examples"
summary: "Modern synchronous View example. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/examples/apps/modern-view-app/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "c4c0bd1dc6754d5e9a8de354c5651e756d751e39"
sourcePath: "examples/apps/modern-view-app/README.en.md"
---

<a id="现代同步-view-示例"></a>
# Modern synchronous View example

[简体中文](/docs/engineering/weapp-container/examples/apps/modern-view-app/index/) · **English**


Run from the repository root:

```sh
cargo run -p container-simulator --features quickjs-native -- \
  dev --project examples/apps/modern-view-app --surface web
```

For a desktop window, enable `quickjs-native,desktop-window` and pass
`--surface desktop`. For V8, enable `v8-native` and pass `--engine v8`.

The page opts into standard synchronous ES2022 through `container.config.json`.
Its TypeScript View uses optional chaining, destructuring, spread, private class
fields, Map/Set, a generator, an enum and BigInt converted to text. The two View
aliases share one ESM dependency. The child remains a legacy WXS component;
its constructor observation uses the WXS compatibility path.

Edit `view/format.view.ts` to exercise a View-only rebuild. The simulator retains
the last running generation if compilation fails. A successful executable
change restarts the session. Async work and host APIs belong in AppService.

Type checking is separate from runtime compilation:

```sh
pnpm install --frozen-lockfile
pnpm modern:view:typecheck
```

View imports use relative paths (JS/TS extensions may be omitted) or npm
package entry points. Runtime compilation does not inherit `tsconfig.json`
path aliases, `baseUrl` or project references, including generated
`.weapp-vite` configurations. `tsconfig.view.json` controls the separate type
check.

The raw `wv build` output keeps its original ownership and format. The modern
aliases are added by the container packer; opening that raw output directly in
WeChat DevTools does not provide this container extension. This example is not
official WXS, device/GPU or near-parity acceptance evidence.
