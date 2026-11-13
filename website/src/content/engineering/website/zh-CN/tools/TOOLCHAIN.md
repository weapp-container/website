---
id: "docs/engineering/website/tools/toolchain"
title: "私人展示包装机"
section: "工具"
summary: "私人展示包装机。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/tools/toolchain/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "c487eff31a98ca75905b66676909cde218e9fb42"
sourcePath: "tools/TOOLCHAIN.md"
---

<a id="private-showcase-packer"></a>
# 私人展示包装机

**简体中文** · [English](/en/docs/engineering/website/tools/toolchain/)


展示使用单独的私有工具链目录。它从不导入
在正常构建期间来自实时核心检出的打包器代码。

维护者导出：

```sh
node tools/export-toolchain.mjs \
  --core /absolute/private-core-checkout \
  --commit EXACT_CORE_COMMIT \
  --dependency-root /absolute/installed/tools/container-manifest \
  --out .runtime/tooling \
  --archive artifacts/private/showcase-toolchain.tar.gz
```

`--dependency-root` 默认为源签出的清单工具目录。
它必须包含已检查的已安装依赖项。导出读取加壳器
来自确切的 Git 提交，而不是未提交的工作文件。它递归地
供应商安装包依赖项，记录其版本并完成
哈希，证明迁移后的加壳器可以独立导入。冲突
软件包版本或未解决的所需依赖项失败。可选本机
包。

存档是私有构建输入。它包含编写的打包器源码和 npm
依赖项，有许可证，但没有 Rust 运行时、渲染器、编译器、原始 Git
对象、构建缓存或凭证。将其 `.lock.json` 与私有代码放在一起
释放；收件人在有界提取到新的文件之前验证存档 SHA-256
`.runtime/tooling` 目录，然后将审核过的锁放在
`.runtime/tooling.lock.json`。不要在站点资产中发布归档或锁定文件。

```sh
node tools/build-miniapp.mjs --toolchain .runtime/tooling --out artifacts/miniapp
```

正常构建会拒绝现有输出，并且从不编辑小型应用程序源。
它验证外部收据引脚和每个工具链文件，上演冻结
本机格式源快照，应用固定的 Terser 5.44.1 和
javascript-obfuscator 5.10.0到每个JS模块，并调用正式的加壳器。
属性和全局变量被保留；控制流扁平化、自我防御
代码、调试器防御和源映射被禁用。种子是固定的，
已记录。这是混淆，而不是声称客户端代码无法恢复。

所有加壳器默认功能均被明确拒绝，则样本的确切值
允许名单已启用。新引入的默认功能仍然被拒绝。必需的
图像、转换后的暂存哈希、工具链闭合和原始源
快照在发布前经过验证。此路径上没有 `--core` 选项。

输出包含 `pack/`、`policy.json` 和 `private-receipt.json`。该政策有
仅 `schemaVersion`、`allowedPackRoots`（实际的清单完整性根），以及
`allowedApis`；它是受限展示运行时的编译时输入。
收据表明输入是以本机 WeChat 格式编写的，并且没有
weapp-vite 编译运行。历史 `manifest.compiler.name` 是格式元数据，
不是编译器执行证据。仅 `pack/` 和授权的受限运行时
属于 Web 演示。将生产者收据和所有工具保密。

为每次更改构建新的输出，检查生成的策略，然后构建
匹配的受限运行时间。旧包根无法在新策略下运行
除非生产者明确保留它们。永远不要默默地更换受限制的
当哈希值或策略不同时，
运行时具有完整的运行时。
