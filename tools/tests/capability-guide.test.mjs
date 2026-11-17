import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCapabilityGuide} from '../generate-capability-guide.mjs';
import {headingIds} from '../documentation/check.mjs';

test('both generated languages preserve defaults and explicitly identify missing platform records', () => {
  const capabilities = {'wx.getRandomValues': 'full', 'wx.request': 'partial'};
  const source = {source: {commit: 'a'.repeat(40)}, capabilities: {canonicalSha256: 'b'.repeat(64)}, coverageGaps: {capabilityOnly: ['wx.getRandomValues']}};
  const zh = renderCapabilityGuide(capabilities, source, 'zh-CN'), en = renderCapabilityGuide(capabilities, source, 'en');
  for (const text of [zh, en]) {
    assert.ok(text.includes('| `wx.getRandomValues` | full |'));
    assert.ok(text.includes('| `wx.request` | partial |'));
    assert.ok(text.includes(source.source.commit));
    assert.ok(text.includes(source.capabilities.canonicalSha256));
    assert.ok(headingIds(text).has('尚无逐平台覆盖记录的能力'));
    assert.ok(headingIds(text).has('capabilities-without-platform-coverage-records'));
  }
  assert.match(en, /1 capabilities have no independent platform coverage records/);
  assert.match(zh, /1 项缺少逐平台状态/);
});
