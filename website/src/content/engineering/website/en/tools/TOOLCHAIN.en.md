---
id: "docs/engineering/website/tools/toolchain"
title: "Private showcase packer"
section: "Tools"
summary: "Private showcase packer. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/tools/toolchain/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "df46170e0d94fdcf52b0153f689870d34eaeb190"
sourcePath: "tools/TOOLCHAIN.en.md"
---

<a id="私人展示包装机"></a>
# Private showcase packer

[简体中文](/docs/engineering/website/tools/toolchain/) · **English**


The showcase consumes a separate private toolchain directory. It never imports
packer code from a live core checkout during its normal build.

Maintainer export:

```sh
node tools/export-toolchain.mjs \
  --core /absolute/private-core-checkout \
  --commit EXACT_CORE_COMMIT \
  --dependency-root /absolute/installed/tools/container-manifest \
  --out .runtime/tooling \
  --archive artifacts/private/showcase-toolchain.tar.gz
```

`--dependency-root` defaults to the source checkout's manifest tool directory.
It must contain the reviewed installed dependencies. The export reads packer
source from the exact Git commit, not uncommitted working files. It recursively
vendors installed package dependencies, records their versions and complete
hashes, and proves the relocated packer can import independently. Conflicting
package versions or unresolved required dependencies fail. Optional native
packages absent on the export OS are listed explicitly.

The archive is a private build input. It contains authored packer source and npm
dependencies, with licenses, but no Rust runtime, renderer, compiler, original Git
objects, build caches, or credentials. Keep its `.lock.json` alongside the private
release; recipients verify the archive SHA-256 before bounded extraction to a new
`.runtime/tooling` directory, then place the reviewed lock at
`.runtime/tooling.lock.json`. Do not publish the archive or lock in site assets.

```sh
node tools/build-miniapp.mjs --toolchain .runtime/tooling --out artifacts/miniapp
```

The normal build rejects an existing output and never edits miniapp sources.
It verifies the external receipt pin and every toolchain file, stages a frozen
native-format source snapshot, applies pinned Terser 5.44.1 and
javascript-obfuscator 5.10.0 to each JS module, and invokes the formal packer.
Properties and globals are preserved; control-flow flattening, self-defending
code, debugger defenses and source maps are disabled. The seed is fixed and
recorded. This is obfuscation, not a claim that client code cannot be recovered.

All packer default capabilities are explicitly denied, then the sample's exact
allowlist is enabled. Newly introduced default capabilities stay denied. Required
images, transformed staging hashes, toolchain closure, and original source
snapshot are verified before publication. There is no `--core` option on this path.

Output contains `pack/`, `policy.json`, and `private-receipt.json`. The policy has
only `schemaVersion`, `allowedPackRoots` (the actual manifest integrity root), and
`allowedApis`; it is the compile-time input for restricted showcase runtimes.
The receipt states that the input was authored in native WeChat format and no
weapp-vite compilation ran. Historical `manifest.compiler.name` is format metadata,
not compiler execution evidence. Only `pack/` and an authorized restricted runtime
belong in the Web demo. Keep producer receipts and all tooling private.

Build to a new output for every change, review the resulting policy, then build
the matching restricted runtime. Old pack roots cannot run under a new policy
unless the producer explicitly retains them. Never silently replace a restricted
runtime with the full runtime when hashes or policies differ.
