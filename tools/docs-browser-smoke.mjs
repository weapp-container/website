import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { docsPages } from '../website/src/data/docs-pages.mjs';
import inventory from '../website/src/data/api-inventory-v1.json' with { type: 'json' };
import { apiSlug } from '../website/src/data/api-group-meta.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 2) {
  assert.ok(['--url', '--output'].includes(args[index]) && args[index + 1] && !options[args[index]], 'Invalid docs browser smoke option');
  options[args[index]] = args[index + 1];
}
const base = new URL(options['--url'] || 'http://127.0.0.1:4325');
const output = resolve(options['--output'] || resolve(root, 'artifacts/web/docs-browser'));
await mkdir(output, { recursive: true });
const checks = [];
const record = (name, detail) => checks.push({ name, detail });
const waitForStableLayout = page => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});
let browser;
let context;
let failure;

try {
  const channel = process.env.SHOWCASE_BROWSER_CHANNEL || 'chrome';
  browser = await chromium.launch({ ...(channel === 'bundled' ? {} : { channel }), headless: true });
  context = await browser.newContext({ viewport: { width: 1365, height: 960 }, reducedMotion: 'reduce', colorScheme: 'light' });
  const page = await context.newPage();
  for (const path of [
    '/', '/guide/', '/platforms/', '/demo/',
    ...docsPages.map(item => item.path),
    ...inventory.apis.map(api => `/docs/api/${apiSlug(api.id)}/`),
  ]) {
    const response = await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200, `${path} returned ${response?.status()}`);
    assert.ok(await page.locator('h1').count(), `${path} has no page heading`);
    record('route', path);
  }

  await page.goto(new URL('/docs/', base).href, { waitUntil: 'domcontentloaded' });
  const desktopSearch = page.locator('#docs-search');
  await desktopSearch.fill('wx.getStorageSync');
  const storageResult = page.locator('#docs-search-results a').filter({ hasText: '本地存储' }).first();
  await storageResult.waitFor({ state: 'visible' });
  assert.match(await storageResult.getAttribute('href'), /\/docs\/api\/wx-storage\//);
  await storageResult.click();
  await page.getByRole('heading', { name: '本地存储' }).waitFor();
  await page.screenshot({ path: resolve(output, 'desktop-api.png'), fullPage: true });
  record('desktop-search', 'wx.getStorageSync opened its API group');

  await page.goto(new URL('/docs/integrations/react-native/', base).href, { waitUntil: 'domcontentloaded' });
  await waitForStableLayout(page);
  const codeBlock = page.locator('.docs-code-block[data-code-language="tsx"]').first();
  const codeColors = () => codeBlock.evaluate(block => ({
    colors: [...new Set([...block.querySelectorAll('code span[style]')].map(token => getComputedStyle(token).color))],
    background: getComputedStyle(block.querySelector('pre')).backgroundColor,
  }));
  const light = await codeColors();
  assert.ok(light.colors.length >= 3, `Light theme code is monochrome: ${JSON.stringify(light)}`);
  await codeBlock.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'code-light.png') });
  await page.locator('#theme-toggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  const dark = await codeColors();
  assert.ok(dark.colors.length >= 3, `Dark theme code is monochrome: ${JSON.stringify(dark)}`);
  assert.notDeepEqual(light.colors, dark.colors, 'Code token colors did not change with the theme');
  assert.notEqual(light.background, dark.background, 'Code background did not change with the theme');
  await codeBlock.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'code-dark.png') });
  record('syntax-highlighting', { light, dark });

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base.origin });
  const expectedCode = await codeBlock.locator('code').textContent();
  await codeBlock.getByRole('button', { name: '复制代码' }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expectedCode, 'Copied code lost characters or line breaks');
  record('copy-highlighted-code', 'Copied exact source text with original line breaks');
  await page.locator('#theme-toggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');

  await page.goto(new URL('/docs/start/', base).href, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#docs-content h2').count(), 4, 'Quick start no longer has three steps and next steps');
  assert.ok(!(await page.locator('#docs-content').textContent()).includes('weapp-vite'), 'Quick start requires a specific build framework');
  assert.match(await page.locator('#docs-content code').first().textContent(), /sdk-contract/);
  await page.locator('a[href="/docs/pack/#own-miniapp"]').first().click();
  await page.getByRole('heading', { name: '打包现有小程序' }).waitFor();
  record('independent-quick-start', 'Three steps link to the standalone mini-program packer');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('/', base).href, { waitUntil: 'domcontentloaded' });
  await waitForStableLayout(page);
  const headerMenu = page.locator('.mobile-menu');
  assert.ok(await headerMenu.isVisible(), 'Mobile global navigation is hidden');
  await headerMenu.locator('summary').click();
  const platformsLink = headerMenu.locator('nav a[href="/platforms/"]');
  await platformsLink.waitFor({ state: 'visible' });
  assert.equal(await platformsLink.textContent(), '全端进展');
  await page.screenshot({ path: resolve(output, 'mobile-navigation.png') });
  const homeLayout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(homeLayout.width <= homeLayout.viewport, `Mobile home overflows horizontally: ${JSON.stringify(homeLayout)}`);
  record('mobile-global-navigation', homeLayout);

  await page.goto(new URL('/docs/', base).href, { waitUntil: 'domcontentloaded' });
  await waitForStableLayout(page);
  await page.locator('.docs-mobile-nav summary').click();
  const mobileSearch = page.locator('#docs-search-mobile');
  await mobileSearch.fill('React Native');
  const nativeResult = page.locator('#docs-search-results-mobile a').filter({ hasText: 'React Native SDK 接入' }).first();
  await nativeResult.waitFor({ state: 'visible' });
  await nativeResult.click();
  await page.getByRole('heading', { name: 'React Native SDK 接入' }).waitFor();
  await waitForStableLayout(page);
  const mobileLayout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(mobileLayout.width <= mobileLayout.viewport, `Mobile document overflows horizontally: ${JSON.stringify(mobileLayout)}`);
  await page.screenshot({ path: resolve(output, 'mobile-react-native.png'), fullPage: true });
  record('mobile-search-and-layout', mobileLayout);
  const mobileCode = await page.locator('.docs-code-block[data-code-language="tsx"]').first().evaluate(block => ({
    width: block.getBoundingClientRect().width,
    fontSize: getComputedStyle(block.querySelector('pre')).fontSize,
    colors: new Set([...block.querySelectorAll('code span[style]')].map(token => getComputedStyle(token).color)).size,
  }));
  assert.ok(mobileCode.colors >= 3 && parseFloat(mobileCode.fontSize) >= 12, `Mobile code is not readable: ${JSON.stringify(mobileCode)}`);
  record('mobile-code', mobileCode);

  const sitemap = await page.evaluate(async () => {
    const response = await fetch('/sitemap.xml');
    return { status: response.status, body: await response.text() };
  });
  assert.equal(sitemap.status, 200);
  assert.ok(sitemap.body.includes('/docs/api/wx-storage/'));
  record('sitemap', 'API routes are indexed');
} catch (error) {
  failure = error;
} finally {
  const report = {
    status: failure ? 'failed' : 'passed',
    base: base.href,
    browser: { version: browser?.version() || null, headless: true },
    checks,
    error: failure ? String(failure.stack || failure) : undefined,
  };
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await context?.close();
  await browser?.close();
}

if (failure) {
  console.error(failure);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: 'passed', base: base.href, checks: checks.length, output }));
}
