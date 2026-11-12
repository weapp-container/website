---
id: "licensing"
title: "Licensing, downloads, and releases"
section: "Releases and support"
summary: "Source licensing, archive terms, repository access, and binary availability."
route: "/docs/licensing/"
locale: "en"
---

LICENSING AND RELEASES

<a id="许可下载与发行"></a>
# Licensing, downloads, and releases

[简体中文](licensing.md) · **English**


The source code license, the license of a certain binary archive, the repository read permission and the platform verification result are four independent pieces of information. Please check item by item according to the actual version used.

| Objects | Licensing | Access & Distribution |
| --- | --- | --- |
| weapp-container core source code | The current source code of the core repository uses Apache-2.0; the license for the build output is provided with the corresponding release file. | Subject to [core repository LICENSE](https://github.com/weapp-container/weapp-container/blob/main/LICENSE). The source code license itself does not grant read rights to other repositories or archives. |
| Android, iOS, Desktop, Flutter, React Native wrapper | Each SDK source code repository comes with Apache-2.0 LICENSE. | Source code and local build tools can be obtained according to the respective repository instructions. Whether npm, pub.dev or other public package services are released depends on the actual package version. |
| Precompiled runtime, SDK, and pack archives | Each archive carries its own `RUNTIME-LICENSE`, LICENSE, and third-party notices; do not substitute a source code license for the archive license. | The exact version, hash, and release repository are recorded in the lock file. `weapp-container/showcase` of the old lock is only used to read the historical assets fixed in it; new assets are written to `weapp-container/website`. Repository permissions do not automatically grant usage or redistribution rights. |
| Website and fixed online demo | The source code license in the site repository can be found in its root directory license file. The demo runtime additionally adheres to the license carried by the actual release archive. | `container.weapp.dev` exposes the same-origin files required for the canned demo, without providing a common SDK, arbitrary pack loading service, or runtime CDN. |
| Fonts & Photos | Noto Sans SC Subset reserved OFL; photography permission and credit documented in `PHOTO-LICENSES.json`. | Check each resource's own notice and license before using it again. |

<a id="download-access"></a>
<a id="访问权限与许可分开"></a>
## Repository access and usage rights

Complete old releases are kept in private `website-private-archive` and `runtime-artifacts-private-archive`, the new downloader only targets these archives for frozen releases, the old lock bytes and hashes are unchanged. Older downloaders need to be upgraded. The current public demo still comes with the Noncommercial Runtime License; it is managed separately from the Apache-2.0 source distribution.

GitHub token, repository member permissions, mirror downloads and obtaining the archive only solve access, and will not modify the permission provided with the archive. Conversely, adopting Apache-2.0 for source code does not automatically open up private releases, signing materials, or built applications.

<a id="binary-availability"></a>
<a id="当前验证与发行状态"></a>
## Current validation and release status

The SDK wrapper source code is currently `0.1.0-preview.6.0`, and the shared protocol package is `0.1.0-preview.5.7`. Locked `restricted-showcase` SDK, runtime, and pack archives are for a fixed demo strategy and do not represent a general SDK product release. The build, installation, running and signing of each platform are displayed in [Platform status](/en/docs/platforms/) respectively; only targets that exist in the lock can be downloaded, and unrecorded status is not inferred to be supported.

Legacy runtime archives continue to use historical licensing, hashes, and release records within the archive. This source code version update will not remark the old binary to a new version, nor will it rewrite the historical release.

<a id="copyright"></a>
<a id="产品标识"></a>
## Product identification

Weapp Container is the product name. The repository name is used to locate source code or release files and does not constitute trademark authorization, commercial use approval, or app store release permission.
