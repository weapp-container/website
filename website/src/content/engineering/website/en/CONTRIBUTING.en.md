---
id: "docs/engineering/website/contributing"
title: "Participate in Development"
section: "Project and maintenance"
summary: "Participate in Development. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/contributing/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "c487eff31a98ca75905b66676909cde218e9fb42"
sourcePath: "CONTRIBUTING.en.md"
---

<a id="参与开发"></a>
# Participate in Development

[简体中文](/docs/engineering/website/contributing/) · **English**


Use Node.js 24.18+ and a pinned pnpm version. Run `pnpm install --frozen-lockfile`, `pnpm runtime:public`, `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`.
Public demo builds do not require a GitHub token; do not disable hash or path validation if a build fails.

When submitting API documentation changes, include versioned interfaces and test sources; behaviors without platform coverage evidence are marked as pending verification.
Do not submit local logs, credentials, device identifiers, signature files, or original internal release archives.
Newly added download assets must use a new version and exact hash, and retain third-party licensing and sources.

By submitting a PR, you hereby agree to contribute the content under this repository's license.
