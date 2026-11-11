# Weapp Container Showcase

Apache-2.0 source for [container.weapp.dev](https://container.weapp.dev), a shared
mini-program, an Astro/React website and native consumers. The browser uses a
Dedicated Worker, QuickJS/WASM and a CanvasKit presenter. Runtime source lives in
[the core repository](https://github.com/weapp-container/weapp-container).

## Development

Use Node.js 24.18+ / 24.x and the pinned pnpm version:

```sh
pnpm --ignore-workspace install --frozen-lockfile
pnpm --ignore-workspace test
```

Building the complete site also requires explicit toolchain, font and runtime
inputs. `pnpm pack`, `pnpm runtime:install` and `pnpm runtime:stage` accept reviewed
inputs; see [platforms](docs/platforms.md) and [deployment](docs/deployment.md).
The current pins describe historical delivery archives. They keep their original
license, hashes and access requirements. The source license update does not
publish replacement binaries or turn old receipts into current verification.

Run the isolated, headless iframe scrolling regression with a local Chrome
installation, then validate the built or staged website against the real runtime:

```sh
node tools/browser-scroll-boundary.mjs
node tools/browser-smoke.mjs --url http://127.0.0.1:4325 --mode scroll-boundary --device iphone-17
```

The latter checks actual guest scroll offsets in all three scenes, outer-page
scroll isolation, rotation, restart and the existing business interaction smoke.
Both commands close their own browser contexts when finished.

## Demonstrations

Fundamentals, shop and ordering use the same mini-program package. Orders and
payments are simulated; state stays in browser or native application storage.
Text editing uses the shared [host message protocol](miniapp/BRIDGE.md).

The optional restricted-showcase build profile limits accepted packs and host
capabilities for hosted demonstrations. The normal source-built runtime remains
available from the core repository. These distribution profiles and their tests
are preserved; source licensing does not change runtime capability negotiation.

## Deployment and license

Deployments require an explicitly verified build and staging acceptance. Third-party
assets, fonts and libraries retain their supplied notices. New core builds carry
Apache-2.0; historical delivered binaries retain their accompanying licenses.
