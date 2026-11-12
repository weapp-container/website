---
id: "api"
title: "Mini-program APIs and capabilities"
section: "API reference"
summary: "API names, host coverage, engines, and conformance evidence by capability group."
route: "/docs/api/"
locale: "en"
---

API REFERENCE

<a id="小程序-api-与能力"></a>
# Mini-program API and capabilities

[简体中文](api.md) · **English**


The interface catalog contains 29 capability groups. Each group retains host and engine status, permission requirements, version conditions, and conformance case numbers in the inventory.

**How to read coverage status**

Read the host and engine columns on each group page. Platform results appear only where the versioned inventory contains explicit coverage. Group-level status and manifest defaults do not establish that a particular host implements or has validated an API.

<a id="基础与生命周期"></a>
## Basics and lifecycle

- [**Capability Query**`capability.query`1 API or capability names · List marked as complete](/en/docs/api/capability-query/)
- [**Application Lifecycle**`lifecycle.app`10 API or capability names · Partially supported](/en/docs/api/lifecycle-app/)
- [**System and Device Information**`system.info`15 API or capability names · Partially supported](/en/docs/api/system-info/)
- [**Mini-program account information**`system.account-info`1 API or capability names · List marked as complete](/en/docs/api/system-account-info/)

<a id="路由与界面"></a>
## Routing and interface

- [**Page Navigation and Page Stack**`navigation.page-stack`7 API or capability names · Partially supported](/en/docs/api/navigation-page-stack/)
- [**Navigation between mini-programs**`wx.mini-program-navigation`1 API or capability names · Partially supported](/en/docs/api/wx-mini-program-navigation/)
- [**Interface feedback and navigation bar**`wx.ui-feedback`8 API or capability names · Partially supported](/en/docs/api/wx-ui-feedback/)

<a id="页面与组件"></a>
## Pages and Components

- [**Page data update**`data.setData`2 API or capability names · Partially supported](/en/docs/api/data-setData/)
- [**WXML, WXSS and template components**`view.wxml-wxss`4 API or capability names ·Partially supported](/en/docs/api/view-wxml-wxss/)
- [**Template event binding**`event.bindings`4 API or capability names ·Partially supported](/en/docs/api/event-bindings/)
- [**Animation**`wx.animation`2 API or capability names · Partially supported](/en/docs/api/wx-animation/)
- [**SelectorQuery**`wx.selector-query`2 API or capability names · Partially supported](/en/docs/api/wx-selector-query/)
- [**IntersectionObserver**`wx.intersection-observer`2 API or capability names · Partially supported](/en/docs/api/wx-intersection-observer/)
- [**MediaQueryObserver**`wx.media-query-observer`2 API or capability names · Partially supported](/en/docs/api/wx-media-query-observer/)
- [**Component selection and relationship query**`component.selection`5 API or capability names · Partially supported](/en/docs/api/component-selection/)
- [**Component relationships**`component.relations`3 API or capability names · Partially supported](/en/docs/api/component-relations/)
- [**Component custom event**`component.events`1 API or capability names · Partially supported](/en/docs/api/component-events/)

<a id="运行时与存储"></a>
## Runtime and storage

- [**Timer**`timer`5 API or capability names · Partially supported](/en/docs/api/timer/)
- [**Local Storage**`wx.storage`10 API or capability names · Partially supported](/en/docs/api/wx-storage/)
- [**File System**`wx.filesystem`12 API or capability names · Partially supported](/en/docs/api/wx-filesystem/)

<a id="媒体与画布"></a>
## Media and Canvas

- [**Canvas Draw**`wx.canvas`3 API or capability names · Partially supported](/en/docs/api/wx-canvas/)
- [**Off-screen Canvas**`wx.canvas-offscreen`1 API or capability names · Partially supported](/en/docs/api/wx-canvas-offscreen/)
- [**Media, Camera, Scanning and Location**`wx.media-camera-location`8 API or capability names · Partially supported](/en/docs/api/wx-media-camera-location/)
- [**Audio context**`wx.inner-audio-context`2 API or capability names · Partially supported](/en/docs/api/wx-inner-audio-context/)
- [**Video context**`wx.video-context`1 API or capability names · Partially supported](/en/docs/api/wx-video-context/)

<a id="宿主与系统能力"></a>
## Host and system capabilities

- [**Permission settings**`wx.permission`4 API or capability names · Partially supported](/en/docs/api/wx-permission/)
- [**Network requests and connections**`wx.request`6 API or capability names ·Partially supported](/en/docs/api/wx-request/)
- [**Login, Users and Payments**`wx.auth-payment`6 API or capability names · Partially supported](/en/docs/api/wx-auth-payment/)
- [**Clipboard and Device Status**`wx.clipboard-device`7 API or capability names · Partially supported](/en/docs/api/wx-clipboard-device/)

<a id="默认值与清单差异"></a>
## Defaults and coverage gaps

- [**Runtime default capabilities**`115 defaults`12 capabilities have no platform-by-platform coverage records. Default values ​​are listed by individual source. ](/en/docs/api/capability-defaults/)

The API snapshot comes from `weapp-container/weapp-container`, source commit `6b2e8074c9ea`. Inventory SHA-256: `2bc18f6f392d7c4a0b13ec371c412c196c97bc18321b64b9a864543393ad3317`.
