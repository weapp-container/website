#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, mkdir, readdir, rm} from 'node:fs/promises';
import {dirname, posix, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = resolve(root, 'website/src/content/engineering');
const manifestPath = resolve(root, 'website/src/data/documentation-sources.json');
const rawRoot = 'website/documentation-snapshots';
export const hash = data => createHash('sha256').update(data).digest('hex');
const git = (path, ...args) => execFileSync('git', ['-C', path, ...args], {maxBuffer: 32 * 1024 * 1024});
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const repositoryName = repository => repository.endsWith('/.github') ? 'organization' : repository.split('/').at(-1);
export function documentRoute(repository, path) {
  const name = repositoryName(repository);
  // A source such as tools/DOCUMENTATION.md can coexist with
  // tools/documentation/README.md. Use one directory spelling on every host,
  // including case-insensitive build filesystems.
  const slug = path.replace(/\.en\.md$/, '.md').replace(/\.md$/, '').replace(/README$/, 'index').replace(/^\.github\//, 'github/').toLowerCase();
  return `/docs/engineering/${name}/${slug}/`;
}
export function rewriteLinks(body, source, locale, routes, assets) {
  const transform = href => {
    const github = href.match(/^https:\/\/github\.com\/(weapp-container\/[^/#]+)(?:\/(?:blob|tree)\/([^/]+)\/(.*?))?(?:#(.*))?$/);
    if (github) {
      const repository = github[1], raw = github[3] || (github[1].endsWith('/.github') ? 'profile/README.md' : 'README.md');
      const file = locale === 'en' && raw.endsWith('.md') && !raw.endsWith('.en.md') ? raw.replace(/\.md$/, '.en.md') : raw;
      const route = routes.get(`${repository}:${file}`) || routes.get(`${repository}:${raw}`);
      if (route) return route + (github[4] && github[4] !== 'readme' ? `#${github[4]}` : '');
      const commit = source.commits?.[repository];
      if (commit && github[2] && ['main', 'master'].includes(github[2])) return `https://github.com/${repository}/blob/${commit}/${raw}` + (github[4] ? `#${github[4]}` : '');
      return href;
    }
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\/)/i.test(href)) return href;
    const [raw, fragment] = href.split('#', 2);
    const target = posix.normalize(posix.join(posix.dirname(source.path), decodeURIComponent(raw)));
    if (target.startsWith('../')) throw new Error(`Document escapes repository: ${source.path}: ${href}`);
    const key = `${source.repository}:${target}`;
    const mapped = routes.get(key);
    let result = mapped || assets.get(key) || `https://github.com/${source.repository}/blob/${source.commit}/${target.split('/').map(encodeURIComponent).join('/')}`;
    if (fragment) result += `#${fragment}`;
    return result;
  };
  // Examples are source bytes, including Markdown examples. Only prose links
  // participate in the site route transformation.
  let fence, prose = '';
  const output = [];
  const flush = () => {
    output.push(prose.split(/(`+[^`]*`+)/g).map((segment, index) => index % 2 ? segment : segment
      .replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g, (match, before, href, after) => before + transform(href) + after)
      .replace(/\b(href|src)=(['"])([^'"]+)\2/g, (match, attribute, quote, href) => `${attribute}=${quote}${transform(href)}${quote}`)
      .replace(/^(\s*\[[^\]\n]+\]:\s*)(\S+)/gm, (match, before, href) => before + transform(href))).join(''));
    prose = '';
  };
  for (const line of body.split(/(?<=\n)/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) {flush(); fence = marker[1];}
      else if (line.trim() === fence) fence = undefined;
      output.push(line);
      continue;
    }
    if (fence) output.push(line); else prose += line;
  }
  flush();
  return output.join('');
}
export function renderSnapshot(source, routes, assets) {
  const body = rewriteLinks(source.raw.toString(), source, source.locale, routes, assets);
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') || source.path;
  const sections = {overview: ['项目与维护', 'Project and maintenance'], architecture: ['架构与协议', 'Architecture and protocols'], rendering: ['渲染与布局', 'Rendering and layout'], validation: ['验证与兼容性', 'Validation and compatibility'], runtime: ['运行时与宿主', 'Runtime and hosts'], crates: ['Rust crate', 'Rust crates'], tools: ['工具', 'Tools'], examples: ['示例', 'Examples'], sdk: ['SDK 工程', 'SDK engineering']};
  const section = sections[source.section]?.[source.locale === 'en' ? 1 : 0] || source.section;
  const metadata = {id: source.route.slice(1, -1), title, section, summary: source.locale === 'en' ? `${title}. Versioned engineering reference from ${source.repository}.` : `${title}。来自 ${source.repository} 的版本化工程说明。`, route: source.route, locale: source.locale, sourceRepository: source.repository, sourceCommit: source.commit, sourcePath: source.path};
  return `---\n${Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${body}`;
}
async function walk(path) {
  const result = [];
  for (const entry of await readdir(path, {withFileTypes: true}).catch(() => [])) {
    assert.ok(!entry.isSymbolicLink(), 'Snapshot symlinks are forbidden');
    const name = `${path}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await walk(name)); else result.push(name);
  }
  return result;
}
export async function verifyDocumentationSnapshot(base = root) {
  const manifest = JSON.parse(await readFile(resolve(base, 'website/src/data/documentation-sources.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  const paths = new Set(), routes = new Set();
  const rawPaths = new Set(), routeMap = new Map(manifest.pages.map(page => [`${page.repository}:${page.path}`, `${page.locale === 'en' ? '/en' : ''}${page.route}`]));
  for (const page of manifest.pages.filter(page => page.repository.includes('/sdk-'))) routeMap.set(`weapp-container/weapp-container:sdk/${page.repository.split('/sdk-')[1]}/${page.path}`, routeMap.get(`${page.repository}:${page.path}`));
  for (const page of manifest.pages.filter(page => page.repository === 'weapp-container/website')) routeMap.set(`weapp-container/weapp-container:website/${page.path}`, routeMap.get(`${page.repository}:${page.path}`));
  const assets = new Map(manifest.assets.map(asset => [`${asset.repository}:${asset.path}`, `/${asset.output}`]));
  const catalogs = new Map();
  const expectedPages = new Set(), expectedAssets = new Set();
  for (const source of manifest.sources) {
    assert.match(source.commit, /^[a-f0-9]{40}$/);
    assert.match(source.catalogSha256, /^[a-f0-9]{64}$/);
    assert.ok(source.catalog.startsWith(`${rawRoot}/`) && !source.catalog.includes('..'));
    rawPaths.add(source.catalog);
    const bytes = await readFile(resolve(base, source.catalog));
    assert.equal(hash(bytes), source.catalogSha256, 'Source catalog hash differs');
    const catalog = JSON.parse(bytes);
    assert.equal(catalog.repository, source.repository, 'Source catalog repository differs');
    catalogs.set(`${source.repository}:${source.commit}`, catalog);
    for (const page of catalog.pages) {
      if (source.repository.endsWith('/website') && page.zh.startsWith('website/src/content/')) {
        assert.ok(page.route?.startsWith('/docs/'), 'Guide has no public documentation route');
        for (const [locale, path] of [['zh-CN', page.zh], ['en', page.en]]) {
          const route = `${locale === 'en' ? '/en' : ''}${page.route}`;
          routeMap.set(`${source.repository}:${path}`, route);
          routeMap.set(`weapp-container/weapp-container:website/${path}`, route);
        }
        continue;
      }
      for (const path of [page.zh, page.en]) expectedPages.add(`${source.repository}:${source.commit}:${path}`);
    }
  }
  for (const page of manifest.pages) {
    assert.ok(!paths.has(page.output), `Duplicate snapshot: ${page.output}`); paths.add(page.output);
    const route = (page.locale === 'en' ? '/en' : '') + page.route;
    assert.ok(!routes.has(route), `Duplicate documentation route: ${route}`); routes.add(route);
    assert.ok(!page.output.includes('..') && page.output.startsWith('website/src/content/engineering/'));
    assert.ok(manifest.sources.some(source => source.repository === page.repository && source.commit === page.commit));
    const catalog = catalogs.get(`${page.repository}:${page.commit}`);
    assert.ok(catalog.pages.some(item => item[page.locale === 'en' ? 'en' : 'zh'] === page.path && item.section === page.section), 'Snapshot page is outside the source allowlist');
    assert.ok(page.source.startsWith(`${rawRoot}/`) && !page.source.includes('..'));
    rawPaths.add(page.source);
    const raw = await readFile(resolve(base, page.source));
    assert.equal(hash(raw), page.sourceSha256, `Modified pinned source: ${page.source}`);
    assert.equal(hash(renderSnapshot({...page, raw, commits: Object.fromEntries(manifest.sources.map(item => [item.repository, item.commit]))}, routeMap, assets)), page.renderedSha256, 'Snapshot transformation differs from pinned source');
    assert.equal(hash(await readFile(resolve(base, page.output))), page.renderedSha256, `Modified documentation snapshot: ${page.output}`);
    for (const match of raw.toString().matchAll(/!\[[^\]]*\]\(([^\s)]+)\)|<img\b[^>]*\bsrc=["']([^"']+)["']/g)) {
      const href = match[1] || match[2];
      if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) continue;
      const path = posix.normalize(posix.join(posix.dirname(page.path), decodeURIComponent(href)));
      expectedAssets.add(`${page.repository}:${page.commit}:${path}`);
    }
  }
  assert.deepEqual(manifest.pages.map(page => `${page.repository}:${page.commit}:${page.path}`).sort(), [...expectedPages].sort(), 'Missing or duplicate allowlisted documentation page');
  const actual = (await walk(resolve(base, 'website/src/content/engineering'))).map(path => path.slice(base.length + 1)).sort();
  assert.deepEqual(actual, [...paths].sort(), 'Unreviewed/missing engineering snapshot file');
  assert.deepEqual((await walk(resolve(base, rawRoot))).map(path => path.slice(base.length + 1)).sort(), [...rawPaths].sort(), 'Unreviewed/missing raw snapshot file');
  assert.deepEqual(manifest.assets.map(asset => `${asset.repository}:${asset.commit}:${asset.path}`).sort(), [...expectedAssets].sort(), 'Missing or unreferenced documentation resource');
  const assetOutputs = new Set();
  for (const asset of manifest.assets) {
    const catalog = catalogs.get(`${asset.repository}:${asset.commit}`);
    assert.ok(catalog?.assets?.some(item => item.path === asset.path && item.sha256 === asset.sha256), 'Resource is outside the source allowlist');
    assert.match(asset.output, /^documentation\/[a-f0-9]{64}\.(?:svg|png|jpe?g|webp|gif)$/i);
    assert.ok(asset.output.startsWith(`documentation/${asset.sha256}.`));
    assert.equal(hash(await readFile(resolve(base, 'website/public', asset.output))), asset.sha256);
    assetOutputs.add(asset.output);
  }
  assert.deepEqual((await walk(resolve(base, 'website/public/documentation'))).map(path => path.slice(resolve(base, 'website/public').length + 1)).sort(), [...assetOutputs].sort(), 'Unreviewed/missing documentation resource file');
  assert.ok(manifest.pages.length > 0);
  return {pages: manifest.pages.length, sources: manifest.sources.length, assets: manifest.assets.length};
}
async function synchronize(sourceRoot, organizationRoot) {
  const repositories = [
    ['weapp-container/weapp-container', sourceRoot],
    ...['android', 'ios', 'desktop', 'flutter', 'react-native', 'contract'].map(name => [`weapp-container/sdk-${name}`, resolve(sourceRoot, 'sdk', name)]),
    ['weapp-container/.github', organizationRoot],
    ['weapp-container/website', root],
  ];
  const manifest = {schemaVersion: 1, sources: [], pages: [], assets: []};
  await rm(resolve(root, rawRoot), {recursive: true, force: true});
  const inputs = [], routes = new Map(), assets = new Map();
  for (const [repository, path] of repositories) {
    const commit = git(path, 'rev-parse', 'HEAD').toString().trim();
    const catalogBytes = git(path, 'show', `${commit}:documentation.json`);
    const catalog = JSON.parse(catalogBytes);
    assert.equal(catalog.repository, repository);
    const catalogOutput = `${rawRoot}/${repositoryName(repository)}/${commit}/documentation.json`;
    await mkdir(dirname(resolve(root, catalogOutput)), {recursive: true});
    await writeFile(resolve(root, catalogOutput), catalogBytes);
    manifest.sources.push({repository, commit, catalog: catalogOutput, catalogSha256: hash(catalogBytes)});
    for (const page of catalog.pages) {
      if (repository.endsWith('/website') && page.zh.startsWith('website/src/content/')) {
        assert.ok(page.route?.startsWith('/docs/'), 'Guide has no public documentation route');
        for (const [locale, file] of [['zh-CN', page.zh], ['en', page.en]]) {
          const route = `${locale === 'en' ? '/en' : ''}${page.route}`;
          routes.set(`${repository}:${file}`, route);
          routes.set(`weapp-container/weapp-container:website/${file}`, route);
        }
        continue;
      }
      for (const [locale, file] of [['zh-CN', page.zh], ['en', page.en]]) {
        const raw = git(path, 'show', `${commit}:${file}`);
        const route = documentRoute(repository, file);
        const item = {repository, commit, path: file, locale, route, section: page.section, raw, checkout: path, allowedAssets: catalog.assets || []};
        inputs.push(item);
        routes.set(`${repository}:${file}`, `${locale === 'en' ? '/en' : ''}${route}`);
      }
    }
  }
  // Resolve links across the core checkout's pinned SDK submodule boundaries.
  for (const input of inputs) {
    if (!input.repository.includes('/sdk-')) continue;
    const sdk = input.repository.split('/sdk-')[1];
    routes.set(`weapp-container/weapp-container:sdk/${sdk}/${input.path}`, routes.get(`${input.repository}:${input.path}`));
  }
  for (const input of inputs.filter(item => item.repository === 'weapp-container/website')) routes.set(`weapp-container/weapp-container:website/${input.path}`, routes.get(`${input.repository}:${input.path}`));
  await rm(resolve(root, 'website/public/documentation'), {recursive: true, force: true});
  for (const source of inputs) {
    for (const match of source.raw.toString().matchAll(/!\[[^\]]*\]\(([^\s)]+)\)|<img\b[^>]*\bsrc=["']([^"']+)["']/g)) {
      const href = match[1] || match[2];
      if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) continue;
      const path = posix.normalize(posix.join(posix.dirname(source.path), decodeURIComponent(href)));
      assert.match(path, /\.(?:svg|png|jpe?g|webp|gif)$/i, `Unsupported documentation asset ${path}`);
      const key = `${source.repository}:${path}`;
      if (assets.has(key)) continue;
      const bytes = git(source.checkout, 'show', `${source.commit}:${path}`), digest = hash(bytes);
      assert.ok(source.allowedAssets.some(item => item.path === path && item.sha256 === digest), `Resource is outside the source allowlist: ${path}`);
      const output = `documentation/${digest}${posix.extname(path)}`;
      await mkdir(dirname(resolve(root, 'website/public', output)), {recursive: true});
      await writeFile(resolve(root, 'website/public', output), bytes);
      assets.set(key, `/${output}`);
      manifest.assets.push({repository: source.repository, commit: source.commit, path, output, sha256: digest});
    }
  }
  await rm(contentRoot, {recursive: true, force: true});
  for (const source of inputs) {
    const rendered = renderSnapshot({...source, commits: Object.fromEntries(manifest.sources.map(item => [item.repository, item.commit]))}, routes, assets);
    const output = `website/src/content/engineering/${repositoryName(source.repository)}/${source.locale}/${source.path.replace(/^\.github\//, 'github/')}`;
    await mkdir(dirname(resolve(root, output)), {recursive: true}); await writeFile(resolve(root, output), rendered);
    const {raw, checkout, allowedAssets, ...record} = source;
    const original = `${rawRoot}/${repositoryName(source.repository)}/${source.commit}/${source.locale}/${source.path.replace(/^\.github\//, 'github/')}`;
    await mkdir(dirname(resolve(root, original)), {recursive: true}); await writeFile(resolve(root, original), raw);
    manifest.pages.push({...record, source: original, sourceSha256: hash(raw), output, renderedSha256: hash(rendered)});
  }
  await writeFile(manifestPath, serialize(manifest));
  console.log(JSON.stringify(await verifyDocumentationSnapshot()));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--check') console.log(JSON.stringify(await verifyDocumentationSnapshot()));
  else {
    assert.equal(args.length, 4, 'Usage: --source-root /core --organization-root /organization | --check');
    assert.equal(args[0], '--source-root'); assert.equal(args[2], '--organization-root');
    await synchronize(resolve(args[1]), resolve(args[3]));
  }
}
