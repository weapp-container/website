<a id="全端演示与历史产物接入"></a>
# Full-end demonstration and access to historical products

[简体中文](platforms.md) · **English**


What is currently public is the source code. The following installation commands reproduce historical precompiled candidates and still require corresponding private archive permissions; they do not constitute a new open source binary release. Source code execution starts from [Core README](https://github.com/weapp-container/weapp-container/blob/main/README.en.md). For each SDK source code construction, see [SDK Description](https://github.com/weapp-container/weapp-container/blob/main/docs/sdk-repositories.en.md). The platform status has not been revalidated against the current open source source code.

Seven systems use a unified portable pack format: basic interaction, product details and specifications, shopping bags, receipt information, simulated payment, ordering, and order records. Each SDK only loads the exact pack candidates for which it was compiled and bundled; each end is upgraded and accepted independently. Business data is only saved locally and is not connected to the real payment, merchant or order backend. Web runs WASM within a browser Dedicated Worker; native hosting uses the platform SDK's natively rendered views.

| System | Host | Native/CI Build Entry | Installation Boundary |
| --- | --- | --- | --- |
| Web | Website embedded WASM demo | `pnpm build`, `pnpm browser:test` | Open directly in browser |
| Android | Kotlin, Flutter, React Native | `native-consumer-build`, `native-build`, `native-react-native-build` | Independent release key signed APK |
| iOS | Swift, Flutter, React Native | `--platform ios` | Swift/RN of the same tool Default simulator; Flutter default device build; physical device installation requires signing and provisioning |
| HarmonyOS / OpenHarmony | ArkUI / N-API | `node tools/native-harmony-build.mjs` | Default unsigned HAP; device installation requires corresponding signature environment |
| macOS | AppKit / C++, Flutter | `--platform macos` | Local app; external distribution requires Developer ID and notarization |
| Windows | Win32/C++, Flutter | `--platform windows` | Built in Windows runner; Authenticode not configured |
| Linux | GTK/C++, Flutter | `--platform linux` | Built in Linux runner; requires GTK3 and local graphics environment |

The actual build, installation, execution, and signing status are recorded in `platforms/status.json` and `artifacts/**/build.json` respectively. The existence of source code, passing static checks, or generating unsigned packages does not equal device operational acceptance.

The platform status is an independent record of each end, and native passing cannot be deduced from the passing status of the Web. This iOS Duo retains `duoAcceptance: simulator-partial`: the final four-gesture interaction and closing of the native and Flutter applications passed, the UIKit indicators and read-only observations of the independent iOS SDK consumer passed; the precise indicators, Chinese input and complete settlement of Flutter's final host, as well as Apple's physical device and signature have not yet been verified. For detailed evidence, see [Duo Acceptance Record](duo-verification.en.md). The SDK consumer pass for Windows is not equal to the Showcase app pass; the window lifecycle pass for Linux still leaves unfinished business interactions with the Flutter ABI.

<a id="安装精确的私有产物"></a>
## Install the correct private product

`platforms/miniapp-artifact.lock.json` Fixed the version, root hash, policy and file-by-file inventory of the current obfuscated pack; install this current pack without `--sdk-id`. `platforms/sdk-artifacts.lock.json` Fixed restricted SDK item by item, each item can belong to different precise release candidates.

When building an existing SDK, the pack installer must pass in the same `--sdk-id`. It first verifies the SDK lock, and then selects the current pack or the historical pack registered by `platforms/miniapp-artifacts.catalog.json` according to the SDK's `packRoot`. The historical lock is located at fixed `platforms/miniapp-history/<packRoot>.lock.json`, and the catalog verifies the complete lock file SHA-256, and then still verifies the candidate release, private repository, policy and archive closure. Unregistered root, policy mismatch, or modified historical locks all fail before downloading; the installer does not provide custom lock paths, repositorys, or tag entries.

The current pack is candidate9’s `f64a47603622…`. Android, desktop, Hongmeng, React Native, and Flutter SDK that have not been separately upgraded retain candidate3's `03ebf262fee0…`, and its original lock is retained byte by byte, and the original build status can be reproduced. The status of these old candidates does not indicate device acceptance for the current new pack. iOS and Flutter iOS use separate SDK entries; the lock and receipt of each end shall prevail. The current artifact locks record is the download source of `weapp-container/website`, which is now public; the frozen historical release is mapped to a private historical file by the tool and still requires independent read permission. The existing `showcase-*` release tag, asset hash, and catalog registry's `weapp-container/showcase` historical sources remain intact, allowing only accurate historical assets to be read. To read private historical files, you need to use `gh` login or release read token with the file permission; `GITHUB_TOKEN` of the public repository does not automatically have cross-repository file permissions.

```sh
node tools/native-pack-artifact.mjs --install --sdk-id android
node tools/sdk-install.mjs --id android
node tools/native-signing.mjs --create
node tools/native-consumer-build.mjs --platform android
```

Pass `--offline /absolute/archive-directory` to the installer respectively during offline delivery. The installer verifies the archive size against SHA-256 before performing an extraction with path, file type, decompression size, and full inventory limits; links, extra files, source code, and debug maps are all rejected. pack installs to `artifacts/miniapp` by default, existing installations are not overwritten; use a clean working directory when switching targets, or explicitly specify a new pack target directory. Each build revalidates the SDK installation directory, exact policy, and pack root, fails when the selected SDK is missing, and does not fall back to the full runtime or any older version.

Flutter’s Android/macOS uses the original audited three-end archive `flutter/android-ios-macos`; iOS uses `flutter/ios` alone, and Linux and Windows use `flutter/linux` and `flutter/windows` respectively. Install to the unified directory on the corresponding target system:

```sh
node tools/native-pack-artifact.mjs --install --sdk-id flutter/android-ios-macos
node tools/sdk-install.mjs --id flutter/android-ios-macos --destination .runtime/sdk/flutter
node tools/native-build.mjs --platform android --flutter /absolute/flutter/bin/flutter
```

Linux runner uses `node tools/sdk-install.mjs --id flutter/linux --destination .runtime/sdk/flutter`, Windows runner changes the id to `flutter/windows`, iOS changes the id to `flutter/ios`; the `--sdk-id` of the pack installer must be consistent accordingly. A working directory only installs a copy of the Flutter SDK that matches the current target.

React Native also uses an installation directory:

```sh
node tools/native-pack-artifact.mjs --install --sdk-id react-native/android-ios
node tools/sdk-install.mjs --id react-native/android-ios --destination .runtime/sdk/react-native
node tools/native-react-native-build.mjs --platform android
```

Desktop SDK ids are `desktop/macos`, `desktop/windows`, `desktop/linux`, iOS is `ios`, and Harmony is `harmony`. The shared private package also fixes the Noto Sans SC and OFL font licenses. The restricted native runtime installs compiled and bound audit fonts before first layout, and turns off system font fallback; the host does not cover up missing fonts by registering system fonts. The SDK wrapper checks each native core slice's font and permission hash tags. Harmony build requirements are officially DevEco SDK/Hvigor/ohpm, with installed tools specified via `DEVECO_HOME`, `OHOS_SDK`, `HVIGOR`, and `OHPM`.

<a id="ios-模拟器与-device-构建"></a>
## iOS simulator and device build

The Swift native consumer uses the same `ios` SDK entry, and the archive contains device and emulator slices. After installing the matching pack and SDK, you can build separately:

```sh
node tools/native-pack-artifact.mjs --install --sdk-id ios
node tools/sdk-install.mjs --id ios
node tools/native-consumer-build.mjs --platform ios
node tools/native-consumer-build.mjs --platform ios --device
```

The default command selects `iphonesimulator` and outputs `artifacts/consumers/ios/derived/Build/Products/Release-iphonesimulator/Showcase.app`; `--device` is only applicable to iOS. Select `iphoneos` and `generic/platform=iOS` and output the corresponding `derived-device/Build/Products/Release-iphoneos/Showcase.app`. Both commands fix `CODE_SIGNING_ALLOWED=NO` and log `unsigned-simulator` or `unsigned-device` respectively. device only represents the target architecture, the build will not install or run on a physical device, nor will it generate a signed IPA.

The two builds share `artifacts/consumers/ios/build.json` and `artifacts/delivery/native/ios`; when you need to retain evidence at the same time, use encapsulate/archive the previous receipt and delivery first, or use an independent working directory to build another target. Don't mix device-built receipts with emulator apps.

Flutter uses the `flutter/ios` entry. `node tools/native-build.mjs --platform ios` builds the obfuscated release device app by default. `--no-codesign` is used when Apple signature is not configured. Appending `--simulator` will build a debug simulator app that is only for local verification. Its receipt is clearly marked as not applicable to release obfuscation and cannot be used as evidence of release protection or device distribution.

<a id="构建与验收"></a>
## Construction and acceptance

`.github/workflows/native.yml` provides `workflow_dispatch`, optional host and system. Each matrix entry passes the same `matrix.id` to the pack and SDK installers, compiles the private product using the target operating system, verifies an exact match, and retains an independent receipt. Missing artifacts, unknown pack root, hash changes, and missing toolchains all cause this to fail. Windows/Linux The native producer is executed on the runner corresponding to the target system and cannot be impersonated by the macOS cross-build result.

The successfully built application is placed in `artifacts/delivery/<host>/<platform>/` and the file inventory is generated. Android additionally verifies APK signatures, certificate fingerprints, 16 KiB native library ZIP alignment and audits core library byte consistency in the AAR. Harmony checks the byte-by-byte hash and ArkTS bytecode of three native libraries in HAP. Flutter release uses `--obfuscate`, and restore symbols are stored in `.private/symbols/`. Android turns on R8, Harmony release turns on ArkGuard. Symbols, maps, keys, and build caches do not go into the application delivery directory.

The Apple `restricted-showcase` static library uses LLVM `llvm-strip --strip-debug` to process each archive member before the core producer calculates the product hash; the producer's `--llvm-strip /absolute/llvm-strip` selects the audit tool and looks for it from PATH when omitted. The producer rejects residual DWARF/STABS and known private source code paths, compares non-debug sections, symbols, relocations and linker metadata member by member, and writes the tool version, pre- and post-cut hashes and verification results into `artifactHardening`. Cargo release's strip setting does not replace this check on third-party static members; no release occurs when pruning or semantic verification fails.

Consumers reinstall the SDK according to the new hash, and then build and package the application; locked or signed binaries will not be modified afterwards. When applying release linking, the debug mapping is also stripped. Finally, `.app` and all Frameworks still need to be checked independently, and the symbol policy of the vendor framework cannot be deduced from the core static library check. React Native's source macros use compiler path mapping. Flutter configures a fixed package URI for the generated plugin registrant and then compiles the AOT to avoid bringing the absolute path of the build machine into the snapshot. The archive retains the framework's original relative links and rejects escaped links and directory cycles.

Windows/Linux locks each file in the delivery from successful receipt, and then starts the unique process, requiring guest ready, non-empty window screenshot, storage flush, normal shutdown and exit code 0. Business status changes are recorded separately, and startup is not considered a business operation. Windows also retains the Common Controls 6 activation manifest in the final EXE. The evidence is located in `artifacts/native-runtime/<host>/<platform>/` and only proves the behavior covered by these checks. The Windows/Linux host explicitly uses the SDK's native 2D raster presenter, and macOS uses hardware rendering.

`tools/native-delivery-artifact.mjs --family native --platform android --receipt artifacts/consumers/android/build.json --upload` Encapsulates and uploads private application products from the successful original build receipt. The file name includes the pack root, app content hash, original build receipt hash, and signature boundaries; Apple unsigned device/simulator apps, unsigned HAPs, and verified signed APKs are noted separately. Re-verification of the same application bytes uses an independent receipt identifier and does not overwrite existing sidecars. Upload the file-by-file digest returned by check GitHub without overwriting the candidate assets. After a network failure, you can use `--upload-only /absolute/archive-path` to verify and retransmit the missing assets.

Native `native-signing --create` generates proprietary keys and 0600 private configurations. The same key must be retained for official updates; the key temporarily generated by CI is only used for this build verification. Swift provides an unsigned simulator/device app, React Native provides an unsigned simulator app by default, and Flutter releases provide an unsigned device app by default; these archives are not signed IPAs that can be installed directly. Official distribution signing by Apple, Harmony, and Windows requires their own authentic credentials.

<a id="宿主边界"></a>
## Host boundary

All hosts handle status and text input according to `miniapp/BRIDGE.md`. The session identity, page identity, and request identity jointly constrain the reply; the business status has a size limit, and the native owner is closed only after the writing is completed. Normal exit and explicit shutdown wait storage flush/release; forced termination by the operating system cannot be guaranteed by the application asynchronous barrier, so the state is persisted when it changes.

These historical native consumers include business hosts, public SDK calls, and necessary permissions. The historical container runtime is delivered as a precompiled library and is compiled with `restricted-showcase`, pack allowlist and API allowlist bound; public websites only deploy restricted web products. Client-side obfuscation and symbol stripping can increase restore costs, but there is no guarantee that the distributed binary cannot be analyzed. Business rules, real payments and keys should be held by the business server.
