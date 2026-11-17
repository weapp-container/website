import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const command = async (binary, args) => (await promisify(execFile)(binary, args, { timeout: 30000, maxBuffer: 2 * 1024 ** 2 })).stdout;
const delay = milliseconds => new Promise(accept => setTimeout(accept, milliseconds));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = text => text.replace(/\s+/gu, '');
const OCR_TARGET_HINTS = ['商店', '保温杯', '加入购物袋', 'MORROW'];

export function ocrLines(tsv, { width, height, scale = 3 }) {
  const lines = new Map();
  for (const row of tsv.trim().split(/\r?\n/).slice(1)) {
    const fields = row.split('\t');
    if (fields.length < 12 || fields[0] !== '5' || Number(fields[10]) < 0 || !fields.slice(11).join('\t').trim()) continue;
    const [left, top, boxWidth, boxHeight] = fields.slice(6, 10).map(Number);
    assert.ok([left, top, boxWidth, boxHeight].every(Number.isFinite) && left >= 0 && top >= 0 && boxWidth > 0 && boxHeight > 0);
    assert.ok(left + boxWidth <= width * scale && top + boxHeight <= height * scale, 'OCR target lies outside the captured window');
    const key = fields.slice(1, 5).join('/'), text = fields.slice(11).join('\t');
    const line = lines.get(key) || { text: '', words: [], left, top, right: left + boxWidth, bottom: top + boxHeight };
    line.words.push({ text: normalize(text), left, top, right: left + boxWidth, bottom: top + boxHeight });
    line.text += text; line.left = Math.min(line.left, left); line.top = Math.min(line.top, top); line.right = Math.max(line.right, left + boxWidth); line.bottom = Math.max(line.bottom, top + boxHeight);
    lines.set(key, line);
  }
  const location = box => ({ text: normalize(box.text), x: (box.left + box.right) / (2 * scale), y: (box.top + box.bottom) / (2 * scale), bounds: { left: box.left / scale, top: box.top / scale, width: (box.right - box.left) / scale, height: (box.bottom - box.top) / scale } });
  return [...lines.values()].map(line => ({ ...location(line), words: line.words.map(location) }));
}

export function selectOcrTarget(lines, label, { bottommost = false } = {}) {
  label = normalize(label);
  const matches = lines.filter(line => line.text.includes(label)).map(line => {
    if (!line.words) return line;
    const candidates = [];
    for (let start = 0; start < line.words.length; start++) {
      let text = '';
      for (let end = start; end < line.words.length; end++) {
        text += line.words[end].text;
        if (!text.includes(label)) continue;
        const words = line.words.slice(start, end + 1), left = Math.min(...words.map(word => word.bounds.left)), top = Math.min(...words.map(word => word.bounds.top));
        const right = Math.max(...words.map(word => word.bounds.left + word.bounds.width)), bottom = Math.max(...words.map(word => word.bounds.top + word.bounds.height));
        candidates.push({ text, x: (left + right) / 2, y: (top + bottom) / 2, bounds: { left, top, width: right - left, height: bottom - top } }); break;
      }
    }
    assert.ok(candidates.length, `Rendered target has no word bounds: ${label}`);
    return candidates.sort((a, b) => a.text.length - b.text.length)[0];
  });
  if (!matches.length) return null;
  if (bottommost) return matches.sort((a, b) => b.y - a.y)[0];
  assert.equal(matches.length, 1, `Ambiguous rendered target: ${label}`);
  return matches[0];
}

export async function nativeCommerceInteraction({ family, platform, pid, window, output, support, capture, readGuest, execute = command }) {
  assert.equal(platform, 'linux', 'Commerce pointer verification currently requires Linux X11');
  assert.notEqual((await readGuest())?.guestStateChanged, true, 'Business state changed before the owned pointer interaction');
  const folder = `commerce-${randomUUID()}`, directory = resolve(output, folder); await mkdir(directory);
  const report = { schemaVersion: 1, status: 'running', applicationPid: pid, windowId: window.windowId,
    scope: 'Real X11 pointer clicks located from rendered text in exact-PID screenshots, followed by the guest state message and persisted shopping cart.', steps: [] };
  async function ownedWindow() {
    assert.equal((await execute('xdotool', ['getwindowpid', window.windowId])).trim(), String(pid), 'Pointer input target belongs to another process');
  }
  async function observe(name) {
    const path = resolve(directory, `${name}.png`), current = await capture({ platform, pid, output: path });
    assert.equal(current.windowId, window.windowId, 'Application window changed during interaction');
    assert.equal(current.width, window.width); assert.equal(current.height, window.height);
    const dimensions = (await execute('identify', ['-format', '%w %h', path])).trim().split(/\s+/).map(Number);
    assert.deepEqual(dimensions, [window.width, window.height], 'Window capture coordinate space differs from its input surface');
    // Light gray Chinese UI labels can disappear against the warm paper background
    // at the native capture scale. Try a small, deterministic set of OCR renderings
    // and retain the variant that recognizes the greatest number of rendered labels.
    // Every click still requires an exact word box from Tesseract; no coordinates are
    // synthesized from a known layout.
    const variants = [
      { id: 'native', args: ['-resize', '300%'], psm: '11' },
      { id: 'gray', args: ['-resize', '400%', '-colorspace', 'Gray', '-contrast-stretch', '0x20%', '-sharpen', '0x1'], psm: '11' },
      { id: 'threshold', args: ['-resize', '400%', '-colorspace', 'Gray', '-contrast-stretch', '0x15%', '-threshold', '72%'], psm: '11' },
      { id: 'gray-block', args: ['-resize', '400%', '-colorspace', 'Gray', '-contrast-stretch', '0x20%', '-sharpen', '0x1'], psm: '6' },
    ];
    let chosen = { score: -1, id: 'native', tsv: '' };
    for (const variant of variants) {
      const enlarged = resolve(directory, `${name}-${variant.id}.png`);
      try {
        await execute('convert', [path, ...variant.args, enlarged]);
        const tsv = await execute('tesseract', [enlarged, 'stdout', '-l', 'chi_sim+eng', '--psm', variant.psm, 'tsv']);
        const normalized = normalize(tsv);
        const score = OCR_TARGET_HINTS.reduce((total, hint) => total + (normalized.includes(hint) ? 1 : 0), 0);
        if (score > chosen.score) chosen = { score, id: variant.id, tsv };
        if (score === OCR_TARGET_HINTS.length) break;
      } finally { await rm(enlarged, { force: true }); }
    }
    const tsv = chosen.tsv;
    await writeFile(resolve(directory, `${name}.tsv`), tsv);
    const bytes = await readFile(path);
    return { lines: ocrLines(tsv, window), screenshot: { file: `${folder}/${name}.png`, size: bytes.length, sha256: digest(bytes), ocrVariant: chosen.id } };
  }
  async function click(name, observation, target) {
    assert.ok(target, `Rendered target was not found: ${name}`);
    await ownedWindow();
    await execute('xdotool', ['windowactivate', '--sync', window.windowId]);
    await execute('xdotool', ['mousemove', '--sync', '--window', window.windowId, String(Math.round(target.x)), String(Math.round(target.y))]);
    await execute('xdotool', ['click', '1']);
    report.steps.push({ action: 'pointer-click', target: name, recognizedText: target.text, bounds: target.bounds, point: { x: Math.round(target.x), y: Math.round(target.y) }, screenshot: observation.screenshot });
    await delay(700);
  }
  try {
    const home = await observe('01-home');
    // Chinese glyphs can be missed by the runner's OCR model at this compact
    // viewport. MORROW is the unique English brand label on the home shop
    // card, so it is a semantic fallback derived from the rendered screenshot.
    const shopNavigation = selectOcrTarget(home.lines, '商店', { bottommost: true })
      ?? selectOcrTarget(home.lines, 'MORROW');
    await click('shop navigation', home, shopNavigation);
    const shop = await observe('02-shop');
    await click('bottle product', shop, selectOcrTarget(shop.lines, '保温杯'));
    let detail, add;
    for (let attempt = 0; attempt < 6; attempt++) {
      detail = await observe(`03-detail-${attempt}`); add = selectOcrTarget(detail.lines, '加入购物袋');
      if (add) break;
      await ownedWindow();
      await execute('xdotool', ['mousemove', '--sync', '--window', window.windowId, String(Math.floor(window.width / 2)), String(Math.floor(window.height / 2))]);
      await execute('xdotool', ['click', '--repeat', '4', '--delay', '120', '5']);
      report.steps.push({ action: 'pointer-scroll-down', notches: 4, screenshot: detail.screenshot });
      await delay(500);
    }
    await click('add bottle to shopping bag', detail, add);
    const started = Date.now(), statePath = resolve(support, family === 'native' ? 'state.json' : 'showcase-state.json'); let state;
    while (true) {
      const guest = await readGuest(); if (guest?.error) throw Error(`Guest interaction failed: ${guest.error}`);
      try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (guest?.guestStateChanged === true && state?.revision >= 1) break;
      assert.ok(Date.now() - started < 15000, 'Pointer interaction did not produce a persisted guest business change'); await delay(100);
    }
    assert.equal(state.cart.length, 1); assert.equal(state.cart[0].id, 'bottle'); assert.equal(state.cart[0].quantity, 1);
    const stateBytes = await readFile(statePath), after = await observe('04-added');
    report.result = { guestStateChanged: true, revision: state.revision, cart: state.cart, persistedStateSha256: digest(stateBytes), screenshot: after.screenshot };
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.error = error.message; throw error; }
  finally { await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
  return report;
}
