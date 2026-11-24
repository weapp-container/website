<a id="历史交付与证据"></a>
# Historical Delivery and Evidence

[简体中文](archived-evidence.md) · **English**


Snapshot preservation of source code maintains documentation, licenses, test inputs, and historical artifact metadata. Old deployment receipts, device collections, complete screenshots, binaries, symbols, and build logs are stored in private archives maintained by stewards and are not included in public Git history.

Complete historical repositories are preserved under private GitHub repository names, such as `weapp-container/website-private-archive`, retaining repository identity, historical references, Release records, and Actions. The new `website` uses a separate identity and receives only approved mainline history. New download tools direct frozen versions to private archives; older tools require upgrades.

`platforms/status.json`, fixed lock files, and the following digests describe historical candidates and do not represent completed platform acceptance for current source code. Version numbers, SHA-256 hashes, and accompanying licenses of existing artifacts remain unchanged. Open-source versions must be independently built, verified, and released.

- [Duo Historical Summary](duo-verification.en.md)
- [Duo Full-Screen Historical Summary](duo-fullscreen-verification.en.md)
- [Deployment Process](deployment.en.md)
