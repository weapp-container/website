---
id: "docs/engineering/weapp-container/docs/conformance/index"
title: "兼容验证"
section: "验证与兼容性"
summary: "兼容验证。来自 weapp-container/weapp-container 的版本化工程说明。"
route: "/docs/engineering/weapp-container/docs/conformance/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "3a7e41ea4af330084b9a8683040f0bb4e61f7833"
sourcePath: "docs/conformance/README.md"
---

<a id="conformance-verification"></a>
# 兼容验证

**简体中文** · [English](/en/docs/engineering/weapp-container/docs/conformance/index/)


Weapp Container 通过固定版本的公开工具行为观察兼容性，测试不以私有实现源码为输入。
基线见 [baseline-v1.json](https://github.com/weapp-container/weapp-container/blob/3a7e41ea4af330084b9a8683040f0bb4e61f7833/docs/conformance/baseline-v1.json)，用例索引见 [case-index-v1.json](https://github.com/weapp-container/weapp-container/blob/3a7e41ea4af330084b9a8683040f0bb4e61f7833/docs/conformance/case-index-v1.json)。

<a id="verification-levels"></a>
## 验证层级

- 单元测试验证 manifest、IR、运行时和证据处理协议。
- headless 回归验证所选运行时路径，不能代替官方开发者工具。
- 官方观察绑定实际工具版本、compiler 提交、执行输入、运行报告和证据哈希。
- 平台、GPU、真机和性能是独立结果，不由其他层级推导。

索引中 unknown、blocked、failed 和 passed 保留各自语义。缺失证据、未执行的
平台和不完整的差异报告不能视为发布通过。历史用例和原始报告保存在私有档案；
请阅读 [历史证据说明](/docs/engineering/weapp-container/docs/archived-evidence/)。当前公开快照没有全量微信兼容声明。

<a id="common-entry-points"></a>
## 常用入口

证据处理测试也使用固定上游仓库的 Vitest / IDE CLI，先准备公开源码依赖：

```sh
pnpm --dir vendor/weapp-vite install --frozen-lockfile
pnpm --dir vendor/weapp-vite --filter weapp-ide-cli... build
pnpm conformance:index
pnpm conformance:verify
pnpm conformance:evidence:test
pnpm mpcore:conformance:run
```

`conformance:verify` 校验已提交的 golden，修改索引后应审核差异再提交。
官方工具执行使用 `pnpm conformance:official`，需按脚本说明提供实际安装的工具和
任务拥有的资源。完整 `near-parity:gates` 在未满足条件时继续失败，保留其报告。

编译器构建和 producer 版本说明见 [compiler-build.md](/docs/engineering/weapp-container/docs/conformance/compiler-build/) 和
[reviewed-producer-revisions.md](/docs/engineering/weapp-container/docs/conformance/reviewed-producer-revisions/)。新增公开结论必须记录
源码、工具、输入、输出、执行方法和剩余限制。
