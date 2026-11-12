import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Usage: node tools/sync-api-doc-snapshot.mjs --source-root /path/to/weapp-container');
assert.equal(args[0], '--source-root', 'Usage: node tools/sync-api-doc-snapshot.mjs --source-root /path/to/weapp-container');
const sourceRoot = resolve(args[1]);
const inventoryPath = resolve(sourceRoot, 'docs/api-inventory-v1.json');
const inventoryBytes = await readFile(inventoryPath);
const inventory = JSON.parse(inventoryBytes);
const contract = await import(pathToFileURL(resolve(sourceRoot, 'tools/container-manifest/src/index.mjs')));
const capabilities = Object.fromEntries(Object.entries(contract.DEFAULT_CAPABILITIES).sort(([left], [right]) => Buffer.compare(Buffer.from(left), Buffer.from(right))));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const capabilityNames = Object.keys(capabilities);
const inventoryNames = new Set(inventory.apis.flatMap((api) => api.names));
const capabilityOnly = capabilityNames.filter((name) => !inventoryNames.has(name));
const inventoryOnly = [...inventoryNames].filter((name) => !Object.hasOwn(capabilities, name)).sort();
const commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.match(commit, /^[a-f0-9]{40}$/);

const metadata = {
  schemaVersion: 1,
  source: {
    repository: 'weapp-container/weapp-container',
    commit,
    inventoryPath: 'docs/api-inventory-v1.json',
    capabilitySourcePath: 'tools/container-manifest/src/index.mjs',
  },
  inventory: {
    schemaVersion: inventory.schemaVersion,
    groupCount: inventory.apis.length,
    canonicalSha256: contract.sha256(contract.canonicalize(inventory)),
    rawSha256: sha256(inventoryBytes),
  },
  capabilities: {
    count: capabilityNames.length,
    canonicalSha256: contract.sha256(contract.canonicalize(capabilities)),
  },
  coverageGaps: { capabilityOnly, inventoryOnly },
};
const output = resolve(websiteRoot, 'website/src/data');
await mkdir(output, { recursive: true });
for (const [name, value] of [
  ['api-inventory-v1.json', inventory],
  ['api-default-capabilities-v1.json', capabilities],
  ['api-source-v1.json', metadata],
]) await writeFile(resolve(output, name), `${JSON.stringify(value, null, 2)}\n`);
console.log(JSON.stringify({ output, sourceCommit: commit, groups: inventory.apis.length, defaultCapabilities: capabilityNames.length, coverageGaps: capabilityOnly.length }, null, 2));
