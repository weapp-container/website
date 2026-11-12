import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {create as createFont} from 'fontkit';
import {verifyFrontendNotices} from './frontend-notices.mjs';
import {verifyPhotoNotices} from './photo-notices.mjs';
import {verifyApiDocsData} from './verify-api-docs.mjs';
import apiInventory from '../website/src/data/api-inventory-v1.json' with { type: 'json' };
import {apiSlug} from '../website/src/data/api-group-meta.mjs';
import {docsPages} from '../website/src/data/docs-pages.mjs';
import {verifyDocumentationSnapshot} from './documentation-snapshot.mjs';
import {verifyApiExamples} from './api-examples.mjs';
import {generateCapabilityGuides} from './generate-capability-guide.mjs';
import {siteReferences} from './site-html.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base = resolve(root,'dist');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function walk(directory) { const result = []; for(const item of await readdir(directory,{withFileTypes:true})) { const path = resolve(directory,item.name); assert.ok(!item.isSymbolicLink(),'Site symlinks are forbidden'); if(item.isDirectory()) result.push(...await walk(path)); else if(item.isFile()) result.push(path); } return result; }
const files = await walk(base);
const fileSet = new Set(files.map(path => relative(base,path).split('\\').join('/')));
const headersPolicy = await readFile(resolve(base,'_headers'),'utf8');
assert.match(headersPolicy,/(?:^|\n)\/docs\/\*\n[ \t]+Cache-Control: [^\n]*no-transform/,'HTML transformation policy is missing for documentation routes');
const apiReceipt = await verifyApiDocsData();
await verifyApiExamples(root);
await generateCapabilityGuides({base: root, check: true});
const documentationReceipt = await verifyDocumentationSnapshot(root);
await verifyFrontendNotices(base);
await verifyPhotoNotices(base);
const fontReceipt=JSON.parse(await readFile(resolve(base,'fonts/font.json')));
assert.match(fontReceipt.fileName,/^showcase-sc-[a-f0-9]{16}\.woff2$/);
const fontBytes=await readFile(resolve(base,'fonts',fontReceipt.fileName));
assert.equal(sha(fontBytes),fontReceipt.sha256,'Website font differs from its reviewed subset');
const websiteFont=createFont(fontBytes);
assert.deepEqual((await readdir(resolve(base,'fonts'))).sort(),['OFL.txt','font.json',fontReceipt.fileName].sort(),'Unreviewed website font asset');
for(const path of files) {
  const rel = relative(base,path);
  assert.ok(!/(^|\/)(source|commands|raw|validation|cargo-target|project|node_modules|\.git|\.runtime)(\/|$)/.test(rel),`Private directory leaked: ${rel}`);
  assert.ok(!/\.(map|rs|cpp|cc|dart|ets|pdb|p12|jks|keystore|ts|tsx)$/.test(rel),`Private source/symbol file leaked: ${rel}`);
  assert.ok((await lstat(path)).size <= 25*1024*1024,`Asset exceeds Cloudflare limit: ${rel}`);
  if(/\.(mjs|js|html|css)$/.test(rel)) assert.ok(!/sourceMappingURL\s*=/.test(await readFile(path,'utf8')),`Source map reference leaked: ${rel}`);
}
const config = JSON.parse(await readFile(resolve(base,'showcase-runtime.json')));
assert.equal(config.distributionProfile,'restricted-showcase');
assert.match(config.policySha256,/^[a-f0-9]{64}$/); assert.match(config.packRoot,/^[a-f0-9]{64}$/);
assert.equal(config.entry,`/runtime/${config.deploymentHash}/index.html`);
const runtime = resolve(base,'runtime',config.deploymentHash);
const inventory = JSON.parse(await readFile(resolve(runtime,'deployment-inventory.json')));
assert.equal(inventory.packRoot,config.packRoot); assert.equal(inventory.policySha256,config.policySha256);
const index = JSON.parse(await readFile(resolve(runtime,'pack-index.json')));
assert.equal(index.integrityRoot,config.packRoot);
const manifestBytes = await readFile(resolve(runtime,index.manifest));
assert.equal(sha(manifestBytes),index.manifestSha256);
assert.equal(JSON.parse(manifestBytes).integrity.root,config.packRoot);
for(const blob of index.blobs) {
  assert.match(blob.url,/^portable-pack\/blobs\/sha256\/[a-f0-9]{64}\.bin$/);
  const bytes = await readFile(resolve(runtime,blob.url));
  assert.equal(bytes.length,blob.size); assert.equal(sha(bytes),blob.sha256);
}
for(const file of inventory.files) {
  assert.ok(!file.path.includes('..') && !file.path.startsWith('/'));
  const bytes = await readFile(resolve(runtime,file.path));
  assert.equal(bytes.length,file.size); assert.equal(sha(bytes),file.sha256,`Deployment byte mismatch: ${file.path}`);
}
const actualRuntime = (await walk(runtime)).map(path=>relative(runtime,path)).sort();
assert.deepEqual(actualRuntime,[...inventory.files.map(file=>file.path),'deployment-inventory.json'].sort(),'Unreviewed runtime file');
const requiredPages = [
  'index.html','demo/index.html','platforms/index.html','guide/index.html','404.html',
  ...docsPages.map(page => `${page.path.slice(1)}index.html`),
  ...apiInventory.apis.map(api => `docs/api/${apiSlug(api.id)}/index.html`),
];
requiredPages.push(...requiredPages.filter(file => file !== '404.html').map(file => `en/${file}`), 'en/404/index.html');
for(const file of requiredPages) assert.ok(fileSet.has(file),`Required page is missing: ${file}`);
const docsSearch = JSON.parse(await readFile(resolve(base,'docs/search-index.json'),'utf8'));
assert.ok(Array.isArray(docsSearch) && docsSearch.length >= docsPages.length + apiInventory.apis.length,'Search index is incomplete');
const expectedSearchPaths = new Set([...docsPages.map(page => page.path), ...apiInventory.apis.map(api => `/docs/api/${apiSlug(api.id)}/`)]);
for(const entry of docsSearch) {
  assert.ok(entry && typeof entry.path === 'string' && typeof entry.title === 'string' && typeof entry.summary === 'string' && typeof entry.keywords === 'string','Malformed documentation search entry');
  assert.ok(expectedSearchPaths.has(entry.path) || entry.path.startsWith('/docs/engineering/'),'Search entry points outside the documentation set');
}
for(const page of docsPages) assert.ok(docsSearch.some(entry => entry.path === page.path && entry.title === page.title),`Search index omits ${page.path}`);
for(const api of apiInventory.apis) {
  const path = `/docs/api/${apiSlug(api.id)}/`;
  assert.ok(docsSearch.some(entry => entry.path === path && entry.keywords.includes(api.id)),`Search index omits API group ${api.id}`);
}
const sitemap = await readFile(resolve(base,'sitemap.xml'),'utf8');
const sitemapRoutes = new Set([...sitemap.matchAll(/<loc>https:\/\/container\.weapp\.dev([^<]*)<\/loc>/g)].map(match => match[1]));
for(const path of ['/','/demo/','/platforms/','/guide/',...docsPages.map(page=>page.path),...apiInventory.apis.map(api=>`/docs/api/${apiSlug(api.id)}/`)]) {
  assert.ok(sitemapRoutes.has(path),`Sitemap omits ${path}`);
}
const htmlFiles = files.filter(path => path.endsWith('.html'));
const references = new Map(await Promise.all(htmlFiles.map(async path => [relative(base, path).split('\\').join('/'), siteReferences(await readFile(path, 'utf8'))])));
const routePairs = JSON.parse(await readFile(resolve(base, 'page-routes.json'), 'utf8'));
for (const pair of routePairs) {
  for (const [locale, path] of Object.entries(pair.routes)) {
    const file = resolve(base, path.slice(1), 'index.html');
    const html = await readFile(file, 'utf8');
    assert.ok(html.includes(`lang="${locale}"`), `Wrong HTML language: ${path}`);
    assert.ok(html.includes(`rel="canonical" href="https://container.weapp.dev${path}"`), `Wrong canonical: ${path}`);
    for (const language of ['zh-CN', 'en', 'x-default']) assert.ok(html.includes(`hreflang="${language}"`), `Missing hreflang in ${path}`);
  }
}
for (const locale of ['zh-CN', 'en']) {
  const prefix = locale === 'en' ? '/en' : '';
  const entries = JSON.parse(await readFile(resolve(base, `${prefix ? 'en/' : ''}docs/search-index.json`), 'utf8'));
  for (const pair of routePairs.filter(page => page.routes[locale].includes('/docs/'))) assert.ok(entries.some(entry => entry.path === pair.routes[locale]), `Search omits ${pair.routes[locale]}`);
  assert.ok(entries.every(entry => entry.path.startsWith(`${prefix}/docs/`) && (locale !== 'en' || !/[\u3400-\u9fff]/u.test(entry.title))), `Wrong-language search index: ${locale}`);
}
let highlightedBlocks = 0;
for(const path of htmlFiles) {
  const rel = relative(base,path).split('\\').join('/');
  const html = await readFile(resolve(base,path),'utf8');
  if(rel.startsWith('docs/') || rel.startsWith('en/docs/')) {
    const blocks = [...html.matchAll(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/g)];
    assert.equal(blocks.length, [...html.matchAll(/data-code-language=/g)].length, `Code block bypasses DocsCode in ${rel}`);
    for(const [,attributes,body] of blocks) {
      assert.match(attributes, /class="[^"]*\bastro-code\b/, `Code block has no syntax highlighting in ${rel}`);
      assert.match(attributes, /--shiki-light:/, `Code block has no light theme in ${rel}`);
      assert.match(attributes, /--shiki-dark:/, `Code block has no dark theme in ${rel}`);
      assert.ok(body.includes('<code>') && body.includes('<span'), `Code block was not rendered in ${rel}`);
      highlightedBlocks++;
    }
  }
  for(const character of new Set(html.match(/[\u3400-\u9fff]/gu)||[]))assert.ok(websiteFont.hasGlyphForCodePoint(character.codePointAt(0)),`Website font lacks ${character}; regenerate the reviewed subset`);
  const pageUrl = rel.endsWith('/index.html') ? `/${rel.slice(0,-'index.html'.length)}` : rel === 'index.html' ? '/' : `/${rel}`;
  for(const value of references.get(rel).links) {
    if(value.startsWith('//') || /^(?:[a-z][a-z0-9+.-]*:)/i.test(value)) continue;
    const targetUrl = new URL(value,`https://container.weapp.dev${pageUrl}`);
    if(targetUrl.origin !== 'https://container.weapp.dev') continue;
    let targetPath = decodeURIComponent(targetUrl.pathname);
    if(targetPath === '/') targetPath = '/index.html';
    else if(targetPath.endsWith('/')) targetPath += 'index.html';
    const targetRel = targetPath.slice(1);
    assert.ok(fileSet.has(targetRel),`Broken internal link or asset in ${rel}: ${value}`);
    if(targetUrl.hash) {
      const targetIds = references.get(targetRel)?.ids || new Set();
      assert.ok(targetIds.has(decodeURIComponent(targetUrl.hash.slice(1))),`Broken page fragment in ${rel}: ${value}`);
    }
  }
}
assert.ok(highlightedBlocks > 0, 'Documentation has no highlighted code examples');
console.log(JSON.stringify({status:'passed',files:files.length,docsPages:requiredPages.length,highlightedBlocks,searchEntries:docsSearch.length,apiGroups:apiReceipt.groups,defaultCapabilities:apiReceipt.capabilities,distributionProfile:config.distributionProfile,deploymentHash:config.deploymentHash,packRoot:config.packRoot,policySha256:config.policySha256}));
