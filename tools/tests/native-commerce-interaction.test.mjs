import test from 'node:test';
import assert from 'node:assert/strict';
import { ocrLines, selectOcrTarget } from '../native-commerce-interaction.mjs';
const header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n';
test('actual OCR word boxes form semantic line targets in the captured window coordinate space', () => {
  const tsv = header + '5\t1\t1\t1\t1\t1\t60\t90\t60\t30\t90\t加入\n5\t1\t1\t1\t1\t2\t120\t90\t90\t30\t91\t购物袋\n5\t1\t2\t1\t1\t1\t30\t600\t60\t30\t85\t商店\n';
  const lines = ocrLines(tsv, { width: 430, height: 812 });
  assert.equal(lines.length, 2); const target = selectOcrTarget(lines, '加入购物袋');
  assert.equal(target.text, '加入购物袋'); assert.equal(target.x, 45); assert.equal(target.y, 35);
  assert.deepEqual(target.bounds, { left: 20, top: 30, width: 50, height: 10 });
});
test('missing and ambiguous text cannot authorize a guessed pointer location', () => {
  assert.equal(selectOcrTarget([], '商店'), null);
  const lines = [{ text: '商店', y: 200 }, { text: '商店', y: 780 }];
  assert.throws(() => selectOcrTarget(lines, '商店'), /Ambiguous/);
  assert.equal(selectOcrTarget(lines, '商店', { bottommost: true }).y, 780);
  assert.throws(() => ocrLines(header + '5\t1\t1\t1\t1\t1\t2000\t0\t20\t30\t90\t商店\n', { width: 430, height: 812 }), /outside/);
});
test('a navigation label uses its own word bounds when OCR groups the entire navigation row', () => {
  const tsv = header + '5\t1\t1\t1\t1\t1\t120\t2250\t60\t30\t90\t探索\n5\t1\t1\t1\t1\t2\t450\t2250\t60\t30\t90\t商店\n5\t1\t1\t1\t1\t3\t780\t2250\t60\t30\t90\t点单\n';
  const target = selectOcrTarget(ocrLines(tsv, { width: 430, height: 780 }), '商店', { bottommost: true });
  assert.equal(target.text, '商店'); assert.equal(target.x, 160); assert.equal(target.y, 755);
});
