import test from 'node:test';
import assert from 'node:assert/strict';
import {scanPublicBytes,wasmCustomSections} from '../audit-public-delivery.mjs';

test('public scans find credentials in binary bytes and report only redacted offsets',()=>{
  const credential='gh'+'p_'+'A'.repeat(36),bytes=Buffer.from('\0binary\0'+credential+'\0');
  const scanned=scanPublicBytes('pkg/runtime.wasm',bytes);
  assert.deepEqual(scanned.findings,[{path:'pkg/runtime.wasm',rule:'github-token',offset:8}]);
  assert.ok(!JSON.stringify(scanned).includes(credential));
  assert.equal(scanPublicBytes('index.html',Buffer.from('-----BEGIN '+'PRIVATE KEY-----')).findings[0].rule,'private-key');
});

test('host paths differ from miniapp page names and the narrowly scoped CanvasKit virtual account',()=>{
  assert.equal(scanPublicBytes('portable-pack/manifest.json',Buffer.from('pages/home/index.js /pages/home/index.wxml')).findings.length,0);
  const host=scanPublicBytes('bundle.js',Buffer.from('"/Users/developer/private/project" "/home/developer/private/project"'));
  assert.deepEqual(host.findings.map(item=>item.rule),['mac-private-path','linux-private-path']);
  const virtual=Buffer.from('HOME:"/home/web_user"');
  assert.equal(scanPublicBytes('runtime/hash/vendor/canvaskit/canvaskit.js',virtual).exceptions.length,1);
  assert.equal(scanPublicBytes('bundle.js',virtual).findings.length,1);
  assert.equal(scanPublicBytes('runtime/hash/vendor/canvaskit/canvaskit.js',Buffer.from('"/home/real-user"')).findings.length,1);
  const windows=String.raw`C:\Users\developer\private`;
  assert.equal(scanPublicBytes('binary.wasm',Buffer.from(windows)).findings[0].rule,'windows-private-path');
  assert.equal(scanPublicBytes('metadata.json',Buffer.from(JSON.stringify(windows))).findings[0].rule,'windows-private-path');
});

test('WASM section inventory parses debug names and rejects corrupt extents',()=>{
  const header=Buffer.from([0,97,115,109,1,0,0,0]),name=Buffer.from('.debug_info');
  const module=Buffer.concat([header,Buffer.from([0,name.length+1,name.length]),name]);
  assert.deepEqual(wasmCustomSections(module),['.debug_info']);
  assert.throws(()=>wasmCustomSections(module.subarray(0,-1)));
  assert.throws(()=>wasmCustomSections(Buffer.from('not wasm')));
});
