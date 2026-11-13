---
id: "docs/engineering/website/docs/platforms"
title: "全端演示与历史产物接入"
section: "运行时与宿主"
summary: "全端演示与历史产物接入。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/docs/platforms/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "88b099619334a4fb751e7e9f089c6ee9d7ef60d5"
sourcePath: "docs/platforms.md"
---

<a id="full-end-demonstration-and-access-to-historical-products"></a>
# 全端演示与历史产物接入

**简体中文** · [English](/en/docs/engineering/website/docs/platforms/)


当前公开的是源码。下列安装命令复现历史预编译候选，仍需相应私有归档权限；它们不构成新的开源二进制发行。源码运行从[核心 README](/docs/engineering/weapp-container/index/)开始，各 SDK 源码构建见[SDK 说明](/docs/engineering/weapp-container/docs/sdk-repositories/)。平台状态尚未针对当前开源源码重新验证。

七个系统使用统一的 portable pack 格式：基础交互、商品详情与规格、购物袋、收货信息、模拟支付、点单、订单记录。每个 SDK 只加载其编译绑定的精确 pack 候选；各端独立升级和验收。业务数据只保存在本机，不连接真实支付、商家或订单后台。Web 在浏览器 Dedicated Worker 内运行 WASM；原生宿主使用平台 SDK 的本地渲染视图。

| 系统 | 宿主 | 本机/CI 构建入口 | 安装边界 |
| --- | --- | --- | --- |
| Web | 网站内嵌 WASM 演示 | `pnpm build`、`pnpm browser:test` | 浏览器直接打开 |
| Android | Kotlin、Flutter、React Native | `native-consumer-build`、`native-build`、`native-react-native-build` | 独立 release key 签名 APK |
| iOS | Swift、Flutter、React Native | 相同工具的 `--platform ios` | Swift/RN 默认模拟器；Flutter 默认 device 构建；真机安装需要签名与 provisioning |
| HarmonyOS / OpenHarmony | ArkUI / N-API | `node tools/native-harmony-build.mjs` | 默认 unsigned HAP；设备安装需要相应签名环境 |
| macOS | AppKit / C++、Flutter | `--platform macos` | 本地应用；外部分发需要 Developer ID 与 notarization |
| Windows | Win32 / C++、Flutter | `--platform windows` | 在 Windows runner 构建；未配置 Authenticode |
| Linux | GTK / C++、Flutter | `--platform linux` | 在 Linux runner 构建；需要 GTK3 与本地图形环境 |

实际构建、安装、执行、签名状态分别记录在 `platforms/status.json` 和 `artifacts/**/build.json`。源代码存在、静态检查通过或生成 unsigned 包，都不等于设备运行验收。

平台状态是各端的独立记录，不能由 Web 的通过状态推导原生通过。本次 iOS Duo 保留 `duoAcceptance: simulator-partial`：最终原生与 Flutter 应用的四姿态交互和关闭通过，独立 iOS SDK consumer 的 UIKit 指标及只读观测恒等通过；Flutter 最终宿主的精确指标、中文输入和完整结算，以及 Apple 真机与签名仍未验证。详细证据见 [Duo 验收记录](/docs/engineering/website/docs/duo-verification/)。Windows 的 SDK consumer 通过不等于 Showcase 应用通过；Linux 的窗口生命周期通过仍保留业务交互与 Flutter ABI 的未完成项。

<a id="install-the-correct-private-product"></a>
## 安装精确的私有产物

`platforms/miniapp-artifact.lock.json` 固定当前已混淆 pack 的版本、根哈希、策略与逐文件 inventory；不带 `--sdk-id` 时安装这一份当前 pack。`platforms/sdk-artifacts.lock.json` 逐项固定 restricted SDK，各条目可属于不同的精确候选 release。

构建已有 SDK 时，pack 安装器必须传入同一个 `--sdk-id`。它先验证 SDK lock，再按 SDK 的 `packRoot` 选择当前 pack 或 `platforms/miniapp-artifacts.catalog.json` 登记的历史 pack。历史 lock 位于固定的 `platforms/miniapp-history/<packRoot>.lock.json`，catalog 校验完整 lock 文件 SHA-256，之后仍校验候选 release、私有仓库、策略及压缩包闭包。没有登记的 root、策略不匹配或被改动的历史 lock 均在下载前失败；安装器不提供自定义 lock 路径、仓库或 tag 入口。

当前 pack 是 candidate9 的 `f64a47603622…`。Android、桌面、鸿蒙、React Native 及尚未单独升级的 Flutter SDK 保留 candidate3 的 `03ebf262fee0…`，其原始 lock 被逐字节保留，原有构建状态可以复现。这些旧候选的状态不代表已通过当前新 pack 的设备验收。iOS 与 Flutter iOS 使用各自独立的 SDK 条目；以 lock 和各端 receipt 为准。当前 artifact locks 记录 `weapp-container/website` 下载来源，该源码仓库现已公开；冻结的历史 release 由工具映射至私有历史档案，仍需独立读取权限。现有 `showcase-*` release tag、资产哈希和 catalog 登记的 `weapp-container/showcase` 历史来源保持原样，只允许读取精确历史资产。读取私有历史档案需使用具有该档案权限的 `gh` 登录或 release read token；公开仓库的 `GITHUB_TOKEN` 不自动拥有跨仓库档案权限。

```sh
node tools/native-pack-artifact.mjs --install --sdk-id android
node tools/sdk-install.mjs --id android
node tools/native-signing.mjs --create
node tools/native-consumer-build.mjs --platform android
```

离线交付时分别给安装器传 `--offline /absolute/archive-directory`。安装器先验证压缩包大小与 SHA-256，再执行有路径、文件类型、解压大小和完整 inventory 限制的提取；链接、额外文件、源代码与调试映射均被拒绝。pack 默认安装到 `artifacts/miniapp`，现有安装不会被覆盖；切换目标时使用干净工作目录，或显式指定新的 pack 目标目录。每次构建重新验证 SDK 安装目录、精确策略与 pack root，缺少选定 SDK 时失败，不会退回完整运行时或任意旧版本。

Flutter 的 Android/macOS 使用原有已审核三端归档 `flutter/android-ios-macos`；iOS 单独使用 `flutter/ios`，Linux 与 Windows 分别使用 `flutter/linux`、`flutter/windows`。在对应目标系统安装到统一目录：

```sh
node tools/native-pack-artifact.mjs --install --sdk-id flutter/android-ios-macos
node tools/sdk-install.mjs --id flutter/android-ios-macos --destination .runtime/sdk/flutter
node tools/native-build.mjs --platform android --flutter /absolute/flutter/bin/flutter
```

Linux runner 使用 `node tools/sdk-install.mjs --id flutter/linux --destination .runtime/sdk/flutter`，Windows runner 将 id 改为 `flutter/windows`，iOS 将 id 改为 `flutter/ios`；pack 安装器的 `--sdk-id` 必须相应一致。一个工作目录只安装与当前目标匹配的一份 Flutter SDK。

React Native 同样使用一个安装目录：

```sh
node tools/native-pack-artifact.mjs --install --sdk-id react-native/android-ios
node tools/sdk-install.mjs --id react-native/android-ios --destination .runtime/sdk/react-native
node tools/native-react-native-build.mjs --platform android
```

桌面 SDK id 为 `desktop/macos`、`desktop/windows`、`desktop/linux`，iOS 为 `ios`，Harmony 为 `harmony`。共享私有包也固定 Noto Sans SC 与 OFL 字体许可。受限原生运行时在首次布局前安装编译绑定的审核字体，并关闭系统字体回退；宿主不通过注册系统字体掩盖缺字问题。SDK 封装会检查每个原生核心 slice 的字体与许可哈希标记。Harmony 构建要求官方 DevEco SDK/Hvigor/ohpm，可通过 `DEVECO_HOME`、`OHOS_SDK`、`HVIGOR` 和 `OHPM` 指定已安装工具。

<a id="ios-simulator-and-device-build"></a>
## iOS 模拟器与 device 构建

Swift 原生消费者使用同一个 `ios` SDK 条目，归档内包含设备和模拟器 slice。安装匹配的 pack 和 SDK 后，可分别构建：

```sh
node tools/native-pack-artifact.mjs --install --sdk-id ios
node tools/sdk-install.mjs --id ios
node tools/native-consumer-build.mjs --platform ios
node tools/native-consumer-build.mjs --platform ios --device
```

默认命令选择 `iphonesimulator`，输出 `artifacts/consumers/ios/derived/Build/Products/Release-iphonesimulator/Showcase.app`；`--device` 仅适用于 iOS，选择 `iphoneos` 与 `generic/platform=iOS`，输出对应的 `derived-device/Build/Products/Release-iphoneos/Showcase.app`。两种命令都固定 `CODE_SIGNING_ALLOWED=NO`，分别记录 `unsigned-simulator` 或 `unsigned-device`。device 只表示目标架构，构建不会安装或运行真机，也不会生成已签名 IPA。

两种构建共用 `artifacts/consumers/ios/build.json` 和 `artifacts/delivery/native/ios`；需要同时保留证据时，先封装/归档前一次的 receipt 与 delivery，或使用独立工作目录，再构建另一种目标。不要把 device 构建的 receipt 与模拟器应用混用。

Flutter 使用 `flutter/ios` 条目。`node tools/native-build.mjs --platform ios` 默认构建混淆后的 release device app，未配置 Apple 签名时使用 `--no-codesign`。追加 `--simulator` 则构建仅供本地验证的 debug simulator app，其 receipt 明确标为不适用 release 混淆，不能作为 release 保护或设备分发证据。

<a id="construction-and-acceptance"></a>
## 构建与验收

`.github/workflows/native.yml` 提供 `workflow_dispatch`，可选宿主与系统。每个矩阵项将同一个 `matrix.id` 传给 pack 和 SDK 安装器，使用目标操作系统、校验精确匹配的私有产物后编译，并保留独立 receipt。产物缺失、未知 pack root、哈希变化和工具链缺失都使该项失败。Windows/Linux 原生 producer 在对应目标系统的 runner 上执行，不能用 macOS 交叉构建结果冒充。

构建成功的应用放在 `artifacts/delivery/<host>/<platform>/`，并生成文件 inventory。Android 额外验证 APK 签名、证书指纹、16 KiB 原生库 ZIP 对齐与审核 AAR 中核心库字节一致性。Harmony 核对 HAP 内三个 native library 的逐字节哈希和 ArkTS bytecode。Flutter release 使用 `--obfuscate`，还原符号保存在 `.private/symbols/`。Android 开启 R8，Harmony release 开启 ArkGuard。符号、映射、密钥与构建缓存不进入应用交付目录。

Apple `restricted-showcase` 静态库在核心生产器计算产物哈希前，使用 LLVM `llvm-strip --strip-debug` 处理每个 archive 成员；生产器的 `--llvm-strip /absolute/llvm-strip` 选择审核工具，省略时从 PATH 查找。生产器拒绝残留的 DWARF/STABS 与已知私有源码路径，逐成员比对非调试 sections、symbols、relocations 和 linker metadata，并把工具版本、裁剪前后哈希与验证结果写入 `artifactHardening`。Cargo release 的 strip 设置不能替代对第三方静态成员的这项检查；裁剪或语义校验失败时不发布。

消费者按新哈希重新安装 SDK，再构建和封装应用；不会对已锁定或已签名的二进制事后修改。应用 release 链接时另剥离调试映射，最终 `.app` 及其所有 Frameworks 仍需独立检查，不能从核心静态库检查推导供应商 framework 的符号策略。React Native 的源码宏采用编译器路径映射。Flutter 为生成的 plugin registrant 配置固定 package URI，再编译 AOT，避免将构建机绝对路径带入快照。归档保留 framework 原有相对链接，拒绝逃逸链接和目录循环。

Windows/Linux 的实际应用验证从成功 receipt 锁定 delivery 中每个文件，再启动唯一所属进程，要求 guest ready、非空窗口截图、storage flush、正常关闭及退出码 0。业务状态变化单独记录，不把启动视为业务操作。Windows 另保留最终 EXE 中的 Common Controls 6 activation manifest。证据位于 `artifacts/native-runtime/<host>/<platform>/`，只证明这些检查覆盖的行为。Windows/Linux 宿主明确使用 SDK 的原生二维 raster presenter，macOS 使用硬件渲染。

`tools/native-delivery-artifact.mjs --family native --platform android --receipt artifacts/consumers/android/build.json --upload` 从成功的原始构建 receipt 封装并上传私有应用产物。文件名包含 pack root、应用内容哈希、原始构建 receipt 哈希和签名边界；Apple 未签名 device/simulator app、未签名 HAP 与已验证签名 APK 分别标明。相同应用字节的再次验证使用独立 receipt 标识，不覆盖已有 sidecar。上传核对 GitHub 返回的逐文件 digest，不覆盖候选资产。网络失败后可用 `--upload-only /absolute/archive-path` 校验并补传缺少的资产。

本机 `native-signing --create` 生成专属密钥和 0600 私有配置。正式更新必须保留同一密钥；CI 临时生成的 key 只用于该次构建校验。Swift 可提供 unsigned simulator/device app，React Native 默认提供 unsigned simulator app，Flutter release 默认提供 unsigned device app；这些归档不是可直接安装的已签名 IPA。Apple、Harmony 与 Windows 的正式分发签名需要各自真实凭据。

<a id="host-boundary"></a>
## 宿主边界

所有宿主按照 `miniapp/BRIDGE.md` 处理状态与文本输入。会话身份、页面身份和请求身份共同约束回复；业务状态有大小限制，写入完成后才关闭 native owner。正常退出与显式关闭等待 storage flush/release；操作系统强制终止无法由应用异步屏障保证，因此状态在变更时即持久化。

这些历史原生消费者包含业务宿主、公开 SDK 调用和必要许可。历史容器运行时以预编译库交付，编译时绑定 `restricted-showcase`、pack allowlist 与 API allowlist；公开网站只部署受限 Web 产物。客户端混淆与剥离符号可以提高还原成本，但不能保证已分发二进制无法被分析。商业规则、真实支付和密钥应由业务服务端持有。
