---
id: "docs/engineering/website/miniapp/bridge"
title: "Showcase bridge 1"
section: "Project and maintenance"
summary: "Showcase bridge 1. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/miniapp/bridge/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "c487eff31a98ca75905b66676909cde218e9fb42"
sourcePath: "miniapp/BRIDGE.en.md"
---

<a id="展示桥1"></a>
# Showcase bridge 1

[简体中文](/docs/engineering/website/miniapp/bridge/) · **English**


The same Skia miniapp runs in all seven hosts. It uses the SDK's existing
`weappContainer.postMessage`, `onMessage`, and `offMessage` API. The host returns
messages with SDK `sendMessage` (Web: `WorkerWebSession.request('host.message', message)`).
This protocol is showcase application data; it is not a new core runtime API.

Every message has `protocolVersion: 1` and `sessionId`. The guest generates a
new session ID at App launch. Hosts must never forward messages between owners.
The host should register its message listener before loading the pack.

<a id="状态"></a>
## State

Guest → host:

```json
{"type":"showcase.state.ready","protocolVersion":1,"sessionId":"showcase-…"}
```

Host → guest (once per session, repeated ready is harmless):

```json
{"type":"showcase.state.restore","protocolVersion":1,"sessionId":"showcase-…","state":null}
```

Use the previously saved state object instead of `null` when available.
Guest changes produce `showcase.state.changed` with the same envelope and
`state`. Persist only that `state`; an active `sessionId` must not be saved and
reused as an identity. A host should return its saved snapshot promptly. A late
restore is ignored after the user has changed data, so it cannot erase a new
shopping bag or order. Only the first accepted restore is applied. Native guest
storage is also used when available; host restore takes precedence before the
first change. Web hosts should persist in their own origin's localStorage.

State schema 1 contains `cart`, `foodCart`, `orders`, `address`, `foodNote`,
`pickup`, `nextOrder`, and `revision`. Do not edit prices or totals: restoration
reconstructs them from the catalog. Quantities are bounded to 20 per specification,
orders to the latest 30, and text to the documented field lengths. Unknown product
IDs and malformed orders are dropped. Reset produces a normal changed snapshot.
No real name, phone or address is required; all seeded values are fictional.

<a id="文字编辑"></a>
## Text editing

Guest → host:

```json
{
  "type":"showcase.text.request","protocolVersion":1,
  "sessionId":"showcase-…","pageId":3,"requestId":"text-1",
  "field":"search","title":"搜索商品","value":"杯",
  "maxLength":40,"multiline":false
}
```

Allowed fields: `search` (40), `address.name` (24), `address.phone` (24),
`address.detail` (160, multiline), `food.note` (120, multiline). Hosts must use
a native text editor, set maximum length, and support normal Chinese IME.
Confirm and cancel are explicit user actions. A dismissed editor returns cancel.

Host → guest:

```json
{"type":"showcase.text.commit","protocolVersion":1,"sessionId":"showcase-…","pageId":3,"requestId":"text-1","value":"保温杯"}
```

Or use `showcase.text.cancel` with the same identity fields and no value.
Copy the session/page/request identifiers from the exact request being answered.
The host must keep only one editor for one owner. Guest sends
`showcase.text.dismiss` with those identifiers when it navigates away, starts a
replacement editor, resets, or retires. Close that exact editor and discard late
native results. A stale session, page, or request never changes guest state.

`pageId` is a guest screen generation, not a native page handle. It increments
on every internal navigation, including leaving and returning to the same screen.
No arbitrary property paths or evaluation are accepted. A text commit writes
only the callback selected by the original allowlisted request.

<a id="关闭"></a>
## Close

The guest owns the visible close button. It sends the current `showcase.state.changed` snapshot followed by `showcase.close.request`, both with `protocolVersion: 1` and the active `sessionId`. The host accepts close only for its current restored guest identity, dismisses its input editor, drains state persistence, then closes that owner. Hosts render the surface to actual view bounds; they do not overlay their own status or close controls. Failure and closed messages can replace the surface after retirement.

<a id="本地商业行为"></a>
## Local business behavior

The route is `pages/home/index`. Launch query `scene=basic|shop|order` opens the
explorer, store, or food menu. Eight internal screens share one Page and one
business store; no native chrome is required for navigation.

MORROW store: search → category → product/specification → shopping bag → address
→ confirmation → simulated payment → order → simulated receipt/cancellation.
Daily Table: category → meal/specification → food bag → pickup/note → simulated
payment → preparing order → simulated pickup/cancellation. Completed and cancelled
orders can be ordered again. Shop and food bags remain independent.

Prices are integer cents; specification extras are included exactly once. Placing
an order takes an immutable copy of its lines/address/note and clears only the
corresponding bag. Orders never contain a real payment token. The UI makes the
simulated nature of both payment and fulfillment explicit.

<a id="所有权和验证"></a>
## Ownership and verification

The host owns editing UI, persistence, keyboard, and OS resources. The guest owns
catalog, filtering, bag contents, prices, order transitions, navigation, and feedback.
Native input bridging does not claim implementation of miniapp `<input>` or IME.
No network, login, device permission, wallet, arbitrary pack loading, or game API
is needed by this sample. The host must close its editor before closing its owner.

Run `node --test tools/tests/miniapp-*.test.mjs` from the showcase repository.
These tests validate business and bridge state machines; actual Skia rendering,
Chinese OS input, scrolling, and platform packaging require host acceptance.
