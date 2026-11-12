---
id: "docs/engineering/weapp-container/docs/host-services/nexttick-scheduler-implementation-scope"
title: "nextTick and idle scheduling implementation scope"
section: "Runtime and hosts"
summary: "nextTick and idle scheduling implementation scope. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/docs/host-services/nexttick-scheduler-implementation-scope/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "ee799c6df3c10e0c52b6e2c09a7632720e3d65c5"
sourcePath: "docs/host-services/nexttick-scheduler-implementation-scope.en.md"
---

<a id="nexttick-与-idle-调度实现范围"></a>
# nextTick and idle scheduling implementation scope

[简体中文](/docs/engineering/weapp-container/docs/host-services/nexttick-scheduler-implementation-scope/) · **English**


retained turn scheduler uses bounded FIFO frontier, Promise checkpoint and Page/Component owner retirement. `wx.nextTick` maintains the callback → void contract; the idle API still lacks a real host idle opportunity producer. Implementation code, Node, and historical native validation are documented separately and cannot be extended by limited web diagnostics contracts.

There were pending network cancellation failures on previous attempts to install the product browser; latest capture-only and minimal stream/GC diagnostics respectively save actual strict status. Diagnosis passed, execution completed, or cleanup passed are not equivalent to Qiduan product acceptance, nor do they establish a cancellation exemption. The original historical report and supplementary attribution corrections are kept separately, see [Evidence](/en/docs/engineering/weapp-container/docs/archived-evidence/) for details.

Three APIs with a total of 21 cells continue Partial; Δavailable=0, Δacceptance=0. No public SDK, hardware, other OS or WeChat oracle acceptance.
