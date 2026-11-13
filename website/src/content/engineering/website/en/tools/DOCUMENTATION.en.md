---
id: "docs/engineering/website/tools/documentation"
title: "Maintaining documentation and the bilingual website"
section: "Tools"
summary: "Maintaining documentation and the bilingual website. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/tools/documentation/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "2a14c0761dcb531666b1ca0085488a8542c54206"
sourcePath: "tools/DOCUMENTATION.en.md"
---

<a id="文档内容与双语网站维护"></a>
# Maintaining documentation and the bilingual website

[简体中文](/docs/engineering/website/tools/documentation/) · **English**

Integration guides live in `website/src/content/guides/`. Maintain engineering prose in its owning public repository; the website stores snapshots pinned to specific commits. Existing Chinese URLs remain stable. English uses `/en/`, without browser-language redirects.

<a id="修改正文与翻译"></a>
## Edit content and translations

Every authored Markdown document has an `.en.md` counterpart, language links, and aliases for renamed headings. Both languages share API names, parameters, commands, and code examples. `documentation.json` records page identity, category, source, a Chinese summary, and the reviewed hash. After changing Chinese content, review English and run `tools/documentation/review.mjs`. The checker does not approve new hashes automatically.

Astro native Markdown collections and shared templates render content. `docs-pages.mjs` supplies integration navigation metadata; `route-map.mjs` checks that each page ID has both languages. Separate search indexes include body text, headings, and API names.

<a id="导入工程文档"></a>
## Import engineering documentation

Commit bilingual source documents and their catalogs first, then run these commands in website. `SOURCE_ROOT` is a public core checkout; `ORGANIZATION_ROOT` is a checkout of the organization’s `.github` repository:

```sh
node tools/documentation-snapshot.mjs \
  --source-root SOURCE_ROOT --organization-root ORGANIZATION_ROOT
node tools/documentation-snapshot.mjs --check
```

The importer admits only cataloged documents and images. Commit the original catalogs, Markdown, source commits, file SHA-256 values, derived hashes, and resource manifest. Documentation links map to the same language within the site; source links point to pinned commits. Verification rejects omitted pages, extra files, and altered originals, derived content, or images. Independent builds require no parent checkout, GitHub token, or private archive.

Website integration guides are excluded from engineering imports. Commit website prose first, import that commit, then commit the snapshots separately to avoid a self-referential commit identity. Do not edit the derived `website/src/content/engineering/` directory by hand.

<a id="api-数据与代码示例"></a>
## API data and code examples

Original API inventory, default capabilities, and source receipts are separate `website/src/data/api-*.json` files. `api-translations.json` supplies presentation translations without changing original support states. Synchronize original API data only when upstream records actually change.

```sh
node tools/sync-api-doc-snapshot.mjs --source-root SOURCE_ROOT
node tools/generate-capability-guide.mjs
node tools/api-examples.mjs --source-root SOURCE_ROOT
node tools/verify-api-docs.mjs
node tools/generate-capability-guide.mjs --check
node tools/api-examples.mjs --check
```

The default capability generator emits both languages. Preserve the distinct conclusions for 115 defaults and 12 gaps in platform coverage. A default does not establish host implementation or acceptance. Source excerpts retain their original context, commit, line numbers, and hash; test excerpts are not standalone integration examples.

<a id="验收与字体"></a>
## Acceptance and fonts

```sh
pnpm docs:check
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm exec wrangler deploy --dry-run --env ''
node tools/docs-browser-smoke.mjs --url http://127.0.0.1:4325
node tools/http-smoke.mjs --url http://127.0.0.1:4325
```

HTTP checks need a Wrangler preview that applies cache and security headers. Browser scripts run headlessly, close their own contexts and browsers, and save evidence for desktop, mobile, both languages, search, copy, and themes. The fixed sample mini-program remains Chinese.

Once translations and snapshots are ready, run `tools/build-website-font.py` with the full Noto Sans SC font verified by SHA-256. Commit the new subset, receipt, and styles. This updates only the website font. Follow the existing [deployment guide](/en/docs/engineering/website/docs/deployment/) for release and rollback. If Actions credentials are missing, retain the verified candidate and follow the existing release process.
