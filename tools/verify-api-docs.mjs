import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (name) => JSON.parse(await readFile(resolve(root, 'website/src/data', name), 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalize = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
};

export async function verifyApiDocsData() {
  const [inventory, capabilities, source] = await Promise.all([
    readJson('api-inventory-v1.json'),
    readJson('api-default-capabilities-v1.json'),
    readJson('api-source-v1.json'),
  ]);
  assert.equal(source.schemaVersion, 1);
  assert.equal(source.inventory.schemaVersion, inventory.schemaVersion);
  assert.equal(source.source.repository, 'weapp-container/weapp-container');
  assert.match(source.source.commit, /^[a-f0-9]{40}$/);
  assert.equal(source.source.inventoryPath, 'docs/api-inventory-v1.json');
  assert.equal(source.source.capabilitySourcePath, 'tools/container-manifest/src/index.mjs');
  assert.equal(source.inventory.groupCount, inventory.apis.length);
  assert.equal(source.inventory.canonicalSha256, sha256(canonicalize(inventory)));
  assert.equal(source.inventory.rawSha256, sha256(`${JSON.stringify(inventory, null, 2)}\n`), 'API inventory was edited without regenerating its source receipt');
  assert.equal(source.capabilities.count, Object.keys(capabilities).length);
  assert.equal(source.capabilities.canonicalSha256, sha256(canonicalize(capabilities)));
  assert.equal(inventory.apis.length, 29, 'Review API group count when the upstream inventory changes');

  const knownLevels = new Set(['full', 'partial', 'unsupported']);
  const groups = new Set();
  const names = new Set();
  for (const api of inventory.apis) {
    assert.ok(api && typeof api.id === 'string' && api.id.length > 0);
    assert.ok(!groups.has(api.id), `Duplicate API group: ${api.id}`);
    groups.add(api.id);
    assert.ok(Array.isArray(api.names) && api.names.length > 0);
    assert.ok(knownLevels.has(api.support), `Invalid API group support: ${api.id}`);
    for (const name of api.names) {
      assert.ok(!names.has(name), `Duplicate API name: ${name}`);
      names.add(name);
    }
    for (const level of Object.values(api.hostCoverage || {})) assert.ok(knownLevels.has(level));
    for (const level of Object.values(api.engineCoverage || {})) assert.ok(knownLevels.has(level));
  }
  for (const [name, level] of Object.entries(capabilities)) {
    assert.match(name, /^(wx\.|Page\.|Component\.|App\.|setTimeout$|setInterval$|clearTimeout$|clearInterval$|getCurrentPages$|data\.)/);
    assert.ok(knownLevels.has(level), `Invalid default capability support for ${name}`);
  }
  const inventoryNames = new Set(names);
  const capabilityOnly = Object.keys(capabilities).filter((name) => !inventoryNames.has(name)).sort();
  const inventoryOnly = [...inventoryNames].filter((name) => !Object.hasOwn(capabilities, name)).sort();
  assert.deepEqual(source.coverageGaps.capabilityOnly, capabilityOnly);
  assert.deepEqual(source.coverageGaps.inventoryOnly, inventoryOnly);
  assert.equal(capabilityOnly.length, 12, 'Review platform coverage labels when the default-only set changes');
  return { groups: inventory.apis.length, inventoryNames: inventoryNames.size, capabilities: Object.keys(capabilities).length, capabilityOnly: capabilityOnly.length, sourceCommit: source.source.commit };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifyApiDocsData()));
}
