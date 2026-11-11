import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, cp, rm, lstat, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function syncPack(pack = resolve(root, 'artifacts/miniapp/pack'), { family, platform } = {}) {
  const manifest = JSON.parse(await readFile(resolve(pack, 'manifest.json'), 'utf8'));
  assert.match(manifest.integrity?.root || '', /^[a-f0-9]{64}$/);
  const files = ['manifest.json'];
  for (const entry of await readdir(resolve(pack, 'blobs/sha256'), { withFileTypes: true })) {
    assert.ok(entry.isFile() && /^[a-f0-9]{64}$/.test(entry.name));
    const path = `blobs/sha256/${entry.name}`, bytes = await readFile(resolve(pack, path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.name); files.push(path);
  }
  const destinations = [
    {family:'flutter',path:'hosts/flutter/assets/portable-pack'},
    {family:'native',platform:'android',path:'hosts/native-android/app/src/main/assets/portable-pack'},
    {family:'native',platform:'ios',path:'hosts/native-ios/portable-pack'},
    {family:'react-native',platform:'android',path:'hosts/react-native/android/app/src/main/assets/portable-pack'},
    {family:'react-native',platform:'ios',path:'hosts/react-native/ios/portable-pack'},
    {family:'harmony',platform:'harmony',path:'hosts/harmony/entry/src/main/resources/rawfile/portable-pack'},
  ].filter(item=>(!family||family===item.family)&&(!platform||!item.platform||platform===item.platform));
  for (const {path:destination} of destinations) {
    const target = resolve(root, destination); await rm(target, { recursive: true, force: true }); await mkdir(target, { recursive: true });
    for (const file of files) { assert.ok((await lstat(resolve(pack, file))).isFile()); await mkdir(dirname(resolve(target, file)), { recursive: true }); await cp(resolve(pack, file), resolve(target, file)); }
  }
  if(destinations.some(item=>item.family==='flutter')) await writeFile(resolve(root, 'hosts/flutter/assets/fixture-index.json'), JSON.stringify(files.sort(), null, 2) + '\n');
  if(destinations.some(item=>item.family==='harmony')) await writeFile(resolve(root, 'hosts/harmony/entry/src/main/resources/rawfile/portable-pack-files.json'), JSON.stringify(files.sort()) + '\n');
  return { packRoot: manifest.integrity.root, files: files.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await syncPack(process.argv[2]))); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
