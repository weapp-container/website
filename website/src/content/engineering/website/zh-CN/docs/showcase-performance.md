---
id: "docs/engineering/website/docs/showcase-performance"
title: "H5 演示交互性能与场景事务"
section: "验证与兼容性"
summary: "H5 演示交互性能与场景事务。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/docs/showcase-performance/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "269411e03828e9d77714eb9c6aec87dbadd35e2d"
sourcePath: "docs/showcase-performance.md"
---

<a id="h5-demonstrates-interactive-performance-and-scene-transactions"></a>
# H5 演示交互性能与场景事务

**简体中文** · [English](/en/docs/engineering/website/docs/showcase-performance/)


本文记录官网 H5 演示的交互性能验收方法，以及场景切换必须保持的运行时边界。这里的浏览器指标只说明 Showcase 的交互体验，不代表微信小程序语义一致性；官方 IDE 用例和多端差分仍按各自的 conformance 收据验收。

<a id="scene-switching-transaction"></a>
## 场景切换事务

商城、点单和基础交互属于同一个演示实例。切换时保留当前 iframe、Dedicated Worker、运行库会话和业务模型，只切换小程序页面状态。重建 iframe 会重新冷启动 Worker、暂时失去画面，也容易丢失未提交的输入或购物状态。

宿主请求必须检查 `event.origin`、`event.source`、协议版本、请求 ID 和场景白名单。重复请求及并发事务要被拒绝。小程序提交页面状态后先回 ACK；宿主还要观察到比切换前更新的 accepted observation，并连续两个动画帧保持稳定，之后才能提交地址栏、活动标签和 ready 状态。ACK 只确认小程序事务，不等于新画面已经可见。

页面导航一次性更新目标页和临时 UI 字段，避免先发布中间态再刷新列表。切换应清理旧页面的文本编辑、动画和确认框；购物车、订单等持久业务模型属于当前 owner，应继续保留。关闭 owner 才清理 Worker 和页面级资源。

相关实现与回归测试：`website/runtime/showcase-scene-controller.mjs`、`website/runtime/showcase-bridge.mjs`、`miniapp/lib/bridge.js`、`miniapp/pages/home/index.js`、`tests/web-scenes.test.mjs`。

<a id="performance-sampling"></a>
## 性能采样

在同一台机器分别对 staging 和生产运行后台浏览器采样；Ego Lite 用于独立现场复验，结果单独记录，不能和 Chrome 合并成一个分位数。性能模式会检查至少 20 个画布输入样本、至少 12 次场景切换，并按 `p95 ≤100ms`、`p99 ≤200ms` 和切场景 `p95 ≤1.5s` 判定：

```sh
node tools/browser-smoke.mjs --mode performance --url https://staging.container.weapp.dev --output artifacts/web/performance-staging
node tools/browser-smoke.mjs --mode performance --url https://container.weapp.dev --output artifacts/web/performance-production
```

报告应保存浏览器及版本、headless 状态、视口、运行库哈希、冷启动和热切场景样本、输入链路样本及各阶段分位数。`pointerup`/`wheel → accepted stable frame` 是端到端输入延迟；`workerEventBatchRoundTrip`、`workerFrameRpc` 和 `acceptedFrameToStable` 用于定位阶段。`hostMessageDrain` 包含 drain 等待的异步工作，不代表纯消息排空时间。性能门禁失败时仍必须保留这些汇总和原始样本。

不要通过缩小渲染比例、跳过 accepted frame、减少稳定帧条件、降低样本数或放宽阈值来“修复”门禁。先对齐输入 request ID、事件批次、frame RPC 和 accepted revision，再判断耗时落在哪个阶段。分开报告冷启动和热切场景，不能让冷启动影响稳定交互分位数，也不能用少数热切换样本声称通过门禁。

<a id="2026-11-08-observation"></a>
## 2026-11-08 观测

2026-11-08 对生产运行库 `e3a8f78a5c7cd4aab08eac102a1681988a3678b838ff7a32da11d4ae07ddb90c` 复跑性能模式：headless Chrome `156.0.8078.80`，视口 `390 × 844`。37 个输入样本未达标，端到端输入 p50 `365.8ms`、p95 `1116.7ms`、p99 `1149ms`。对应 `frame` RPC p50 `345.2ms`、p95 `736.5ms`、p99 `756.3ms`；事件批次 RPC p95 `20.9ms`，accepted frame 稳定等待 p95 `32.8ms`。耗时主要集中在 frame/presentation 路径，事件桥接和 accepted 后的稳定确认不是主要部分。`hostMessageDrain` p95 `717.6ms`，但会与 frame 工作重叠，不能单独解释为消息队列开销。

同次采样包括 14 次热场景切换，p50 `898.7ms`、p95 `1168.4ms`，满足 `1.5s` 门槛。冷启动 8 次，p95 `31.1s`；冷启动会受浏览器缓存和资产下载影响，单独分析，不混入热交互。业务链路 21 checks、38 actions、0 个浏览器错误和 0 个失败请求；性能模式整体仍因输入延迟超标而失败。生产 Ego Lite 页此前停留在 loading，且没有稳定画面或运行事件，因此该环境的现场复验结论为未完成，不是通过，也不足以单独归因于运行库。

此前失败报告缺少浏览器上下文和场景/冷启动汇总，虽然逐项输入与 RPC 数据仍在。`tools/browser-smoke.mjs` 现已调整为门禁成功与失败都写出统一的性能摘要、样本、浏览器版本、视口和运行库哈希，方便直接复盘失败路径。

部署继续遵循 [官网部署与回滚](/docs/engineering/website/docs/deployment/)：先 staging 验收，保存线上前快照、当前与上一版 Worker ID，再部署生产并复跑浏览器及 HTTP smoke。部署成功和业务 smoke 通过不能替代性能门禁；所有失败项和回滚身份都要留在发布记录中。

<a id="2026-11-10-repair-and-acceptance"></a>
## 2026-11-10 修复验收

根因包括 DPR 2 的自动上限、共享 CPU 目标尺寸映射与整帧复制、图片的 JSON/重复字节验证、逐字形 JS/WASM 调用、Worker 嵌套 timer 的最小延迟，以及默认字重 100 的字体。新 Web 产物改用完整字符覆盖的 Regular 400 字体和实际 DPR；目标预算不足明确报错，不降采样。历史原生 SDK 仍按其原始字体哈希安装，不能把新 Web 字体算作旧 SDK 已重建。

Chrome 157.0.8103.39、Apple M4 Max ANGLE Metal 的本地产物候选 17（`2ab0c461b0ffc473075a47c01899e0b3b3db1b53d96755d44fc4ddef3c91bb13`）通过 37 次输入和 14 次热切换：输入到稳定两帧 p95 88.5ms、p99 98.9ms；热切换 p95 230.6ms。本地 8 次冷启动 p95 1,514.8ms，仅反映本机静态服务，不是线上网络首帧。

同一折叠屏商城场景，DPR 2，逻辑 951×669、物理 1902×1338，180 次真实 wheel 持续 9.058 秒：RAF 60.06 次/秒、未观察到漏帧间隔、无主线程 long task；175 个不同 revision 的呈现 ACK，19.32 次/秒。ACK 更新率不是显示扫描帧率。JS heap 从 69,721,934 增至 127,847,819 字节，不包含 WASM、GPU 或 native 内存。

线上 staging 初次因 WASM 网络下载超时而未 ready，失败报告保留。第二次已运行 27 次输入（p95 83.4ms），但测试采样的 canvas 在 RAF 替换期间脱离 DOM，流程未完整通过；测试现在返回原有有限重试路径重新取得当前 canvas，保留输入验证、样本量及两 RAF 稳定条件。完整线上结果另行记录，不能用本地通过替代。

折叠屏 DPR 3 的目标超出当前 16 MiB RGBA 预算，明确返回 ERR_RENDER；没有通过降低 DPR 回避。原始成功与失败数据位于 `docs/evidence/2026-11-10-render-density-performance/`，线上发布和 native 各平台设备测量仍需独立验收。

staging 第三轮完整通过：37 次输入 p95 82.5ms、p99 98.8ms，14 次热切换 p95 222.9ms；8 次冷启动 p50 871.7ms、p95 127,579.3ms，说明网络首次加载仍有明显长尾。没有浏览器错误或失败请求，Worker/context 均已释放。DPR 3 的手机视口 402×874 实际目标 1206×2622，180 次 wheel 观察到 180 个不同 ACK、RAF 59.99 次/秒、零漏帧间隔、零 long task；JS heap 80,095,283→90,916,052 字节。该手机视口与折叠屏尺寸不同，不能把两者当作相同负载的密度性能比较。
