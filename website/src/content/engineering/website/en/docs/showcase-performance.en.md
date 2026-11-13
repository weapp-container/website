---
id: "docs/engineering/website/docs/showcase-performance"
title: "H5 demonstrates interactive performance and scene transactions"
section: "Validation and compatibility"
summary: "H5 demonstrates interactive performance and scene transactions. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/docs/showcase-performance/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "df46170e0d94fdcf52b0153f689870d34eaeb190"
sourcePath: "docs/showcase-performance.en.md"
---

<a id="h5-演示交互性能与场景事务"></a>
# H5 demonstrates interactive performance and scene transactions

[简体中文](/docs/engineering/website/docs/showcase-performance/) · **English**


This article records the interactive performance acceptance method of the H5 demonstration on the official website, as well as the runtime boundaries that must be maintained during scene switching. The browser indicators here only describe the interactive experience of Showcase and do not represent the semantic consistency of the WeChat mini-program; official IDE use cases and multi-terminal differences are still accepted according to their respective conformance receipts.

<a id="场景切换事务"></a>
## Scene switching transaction

The mall, ordering and basic interaction belong to the same demonstration instance. When switching, the current iframe, Dedicated Worker, runtime session, and business model are retained, and only the mini-program page status is switched. Rebuilding the iframe will restart the Worker, temporarily lose the screen, and easily lose unsubmitted input or shopping status.

Host requests must check `event.origin`, `event.source`, protocol version, request ID, and scenario whitelist. Duplicate requests and concurrent transactions are rejected. The mini-program returns ACK first after submitting the page status; the host also needs to observe the accepted observation that is newer than before the switch and keep it stable for two consecutive animation frames before submitting the address bar, active label and ready status. ACK only confirms the mini-program transaction and does not mean that the new screen is visible.

Page navigation updates the target page and temporary UI fields at one time to avoid releasing intermediate states first and then refreshing the list. The switch should clean up the text editing, animations and confirmation boxes of the old page; persistent business models such as shopping carts and orders belong to the current owner and should continue to be retained. Worker and page-level resources are cleaned up only after closing the owner.

Relevant implementation and regression testing: `website/runtime/showcase-scene-controller.mjs`, `website/runtime/showcase-bridge.mjs`, `miniapp/lib/bridge.js`, `miniapp/pages/home/index.js`, `tests/web-scenes.test.mjs`.

<a id="性能采样"></a>
## Performance Sampling

Use the same machine to sample staging and production run background browsers respectively; Ego Lite is used for independent on-site re-inspection, and the results are recorded separately and cannot be combined with Chrome into one quantile. Performance mode checks at least 20 canvas input samples, at least 12 scene switches, and determines by `p95 ≤100ms`, `p99 ≤200ms`, and `p95 ≤1.5s`:

```sh
node tools/browser-smoke.mjs --mode performance --url https://staging.container.weapp.dev --output artifacts/web/performance-staging
node tools/browser-smoke.mjs --mode performance --url https://container.weapp.dev --output artifacts/web/performance-production
```

The report should save the browser and version, headless status, viewport, runtime hash, cold start and eager scenario samples, input link samples and quantiles of each stage. `pointerup`/`wheel → accepted stable frame` are end-to-end input delays; `workerEventBatchRoundTrip`, `workerFrameRpc`, and `acceptedFrameToStable` are used for the positioning phase. `hostMessageDrain` contains drain waiting asynchronous work and does not represent pure message draining time. These aggregate and raw samples must still be retained when performance gating fails.

Do not "fix" gating by scaling down the render scale, skipping accepted frames, reducing stable frame conditions, lowering sample count, or relaxing thresholds. First align the input request ID, event batch, frame RPC and accepted revision, and then determine which stage the time consumption falls on. By reporting cold-start and hot-switch scenarios separately, cold starts cannot be allowed to impact the stable interaction quantile, nor can a few hot-switch samples be claimed to pass the gate.

<a id="2026-11-08-观测"></a>
## 2026-11-08 Observation

2026-11-08 Rerun performance mode for production runtime `e3a8f78a5c7cd4aab08eac102a1681988a3678b838ff7a32da11d4ae07ddb90c`: headless Chrome `156.0.8078.80`, viewport `390 × 844`. 37 input samples failed to meet the standard, end-to-end input p50 `365.8ms`, p95 `1116.7ms`, p99 `1149ms`. Corresponding to `frame` RPC p50 `345.2ms`, p95 `736.5ms`, p99 `756.3ms`; event batch RPC p95 `20.9ms`, accepted frame stable waiting for p95 `32.8ms`. The time consuming is mainly concentrated on the frame/presentation path, event bridging and stable confirmation after accepted are not the main parts. `hostMessageDrain` p95 `717.6ms`, but will overlap with frame work and cannot be explained as message queue overhead alone.

The same sampling includes 14 thermal scene switches, p50 `898.7ms`, p95 `1168.4ms`, meeting the `1.5s` threshold. 8 cold starts, p95 `31.1s`; cold starts will be affected by browser cache and asset download, and will be analyzed separately and not mixed with hot interactions. Business link 21 checks, 38 actions, 0 browser errors, and 0 failed requests; the overall performance model still failed due to excessive input latency. The production Ego Lite page was stuck at loading, and there were no stable images or running events. Therefore, the on-site re-inspection of this environment concluded that it was incomplete, not passed, and was not sufficiently attributed to the runtime library alone.

Previous failure reports lacked browser context and scenario/cold start summary, although itemization and RPC data are still there. `tools/browser-smoke.mjs` has been adjusted to write a unified performance summary, sample, browser version, viewport and runtime library hash for both success and failure of access control, making it easier to directly review the failure path.

The deployment continues to follow [Official website deployment and rollback](/en/docs/engineering/website/docs/deployment/): staging acceptance first, saving the online snapshot, current and previous version of Worker ID, then deploying production and re-running the browser and HTTP smoke. Deployment success and business smoke passing cannot replace performance gatekeeping; all failures and rollback identities must be retained in the release record.

<a id="2026-11-10-修复验收"></a>
## 2026-11-10 Repair and acceptance

Root causes include automatic capping of DPR 2, shared CPU target size mapping with full-frame copying, JSON/ repeated byte verification for images, glyph JS/WASM calls, minimum latency for Worker nested timers, and default weight 100 fonts. The new web product uses Regular 400 fonts with complete character coverage and actual DPR; if the target budget is insufficient, an error will be clearly reported and no downsampling will be performed. Historical native SDKs are still installed with their original font hashes, and new web fonts cannot be counted as if the old SDK has been rebuilt.

Chrome 157.0.8103.39, native product candidate 17 (`2ab0c461b0ffc473075a47c01899e0b3b3db1b53d96755d44fc4ddef3c91bb13`) of Apple M4 Max ANGLE Metal passed 37 inputs and 14 hotswitches: input to stable two frames p95 88.5ms, p99 98.9ms; hotswitch p95 230.6ms. Local 8 cold starts p95 1,514.8ms, only reflects the local static service, not the first frame of the online network.

The same folding screen mall scene, DPR 2, logical 951×669, physical 1902×1338, 180 real wheels lasting 9.058 seconds: RAF 60.06 times/second, no missed frame interval, no main thread long task; 175 different revisions of rendering ACK, 19.32 times/second. The ACK update rate is not the display scan frame rate. JS heap increased from 69,721,934 to 127,847,819 bytes, not including WASM, GPU or native memory.

Online staging is not ready for the first time due to WASM network download timeout, and the failure report is retained. The second time has been run for 27 inputs (p95 83.4ms), but the canvas sampled by the test was separated from the DOM during RAF replacement, and the process was not completely passed; the test now returns to the original limited retry path to reacquire the current canvas, retaining input verification, sample size, and two RAF stability conditions. Complete online results are recorded separately and cannot be replaced by local passes.

Folding screen DPR 3 target exceeds current 16 MiB RGBA budget, explicitly returning ERR_RENDER; not circumvented by lowering DPR. The original success and failure data are located in `docs/evidence/2026-11-10-render-density-performance/`. Online publishing and native platform device measurements still require independent acceptance.

The third round of staging passed completely: 37 inputs p95 82.5ms, p99 98.8ms, 14 hot switches p95 222.9ms; 8 cold starts p50 871.7ms, p95 127,579.3ms, indicating that the network still has a significant long tail in the first load. There are no browser errors or failed requests, and Worker/context is released. DPR 3's mobile viewport 402×874 actual target 1206×2622, 180 wheel observations, 180 different ACKs, RAF 59.99 times/second, zero missed frame interval, zero long task; JS heap 80,095,283→90,916,052 bytes. The viewport of this mobile phone is different from the size of the folding screen, so the density performance comparison of the two cannot be compared as the same load.
