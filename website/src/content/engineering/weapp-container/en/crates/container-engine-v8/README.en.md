---
id: "docs/engineering/weapp-container/crates/container-engine-v8/index"
title: "container-engine-v8"
section: "Rust crates"
summary: "container-engine-v8. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/crates/container-engine-v8/index/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "2c815f079426f3ff9910ed1433eb1f53b1961f3c"
sourcePath: "crates/container-engine-v8/README.en.md"
---

# container-engine-v8

[简体中文](/docs/engineering/weapp-container/crates/container-engine-v8/index/) · **English**


This crate exposes two explicit modes:

* the default build is a metadata stub and every execution method returns
  `NativeBackendUnavailable`;
* `--no-default-features --features v8-native` links the pinned `v8 =
  152.2.0` (rusty_v8) provider and executes CommonJS modules inside a V8
  isolate.

There is no fallback between modes. A host that requests V8 must build with
`v8-native`; otherwise it receives a stable engine error before loading any
module. Rusty V8 downloads the release archive for the target during the
feature-enabled build. Set `RUSTY_V8_MIRROR`/`RUSTY_V8_ARCHIVE` and
`RUSTY_V8_ARCHIVE_SHA256` in a reproducible build environment when the archive
must come from an internal mirror.

The provider keeps all JavaScript execution on the isolate thread and exposes
only the batch `container_core::JsEngine` boundary. Module loading wraps the
source in a CommonJS `module/exports` scope; calls serialize one value batch
through JSON and return one value batch, avoiding per-node FFI calls.

Native timer behavior is shared with QuickJS. A host poll supplies Unix
milliseconds as a non-negative safe integer, including explicit zero. Due
timers run by deadline and then registration order; every callback is followed
by a native V8 microtask checkpoint before the next timer. Cancellation from
that checkpoint takes effect immediately. Timers created during the poll wait
until a later poll. Overdue intervals coalesce to one tick per poll and use the
poll's clock for their next deadline, so a late poll cannot spin through missed
periods. Delays are truncated and clamped to 0–2147483647 ms; deadline addition
saturates at `Number.MAX_SAFE_INTEGER`. Additional callback arguments and the
`globalThis` receiver are preserved.

Each poll permits at most 1000 timer callbacks by default; the internal
`__container_drain_timers` engine call accepts an optional second argument from
1 to 1000 to lower that budget. A `timer.yield` host event reports a retained
backlog. Timer/`queueMicrotask` errors are reported without dropping subsequent
work. The budget limits timer callbacks, not arbitrary synchronous JavaScript
or an infinite Promise chain: V8's checkpoint drains the native microtask queue,
and hosts retain responsibility for execution deadlines and interruption.
