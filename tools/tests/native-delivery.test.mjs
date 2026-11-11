import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import test from 'node:test';
import { stageDelivery } from '../native-delivery.mjs';
import { ROOT } from '../sdk-install.mjs';

test('staging preserves relocatable framework links and exact file bytes', { skip: process.platform === 'win32' }, async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), 'showcase-delivery-'));
  const family = `test-${basename(temporary)}`;
  try {
    const source = resolve(temporary, 'Example.app');
    await mkdir(resolve(source, 'Versions/A'), { recursive: true });
    await writeFile(resolve(source, 'Versions/A/core'), 'reviewed-binary');
    await symlink('A', resolve(source, 'Versions/Current'));
    await symlink('Versions/Current/core', resolve(source, 'core'));
    const result = await stageDelivery(family, 'macos', source);
    const copied = resolve(result.path, 'Example.app');
    assert.equal(await readlink(resolve(copied, 'Versions/Current')), 'A');
    assert.equal(await readlink(resolve(copied, 'core')), 'Versions/Current/core');
    assert.equal(await readFile(resolve(copied, 'core'), 'utf8'), 'reviewed-binary');
    assert.equal(result.files, 3);
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(resolve(ROOT, 'artifacts/delivery', family), { recursive: true, force: true });
  }
});

test('staging refuses external and cyclic bundle links before copying', { skip: process.platform === 'win32' }, async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), 'showcase-delivery-'));
  const family = `test-${basename(temporary)}`;
  try {
    const source = resolve(temporary, 'Example.app'); await mkdir(source);
    await writeFile(resolve(temporary, 'outside'), 'private-data');
    await symlink('../outside', resolve(source, 'escape'));
    await assert.rejects(stageDelivery(family, 'macos', source), /escapes its bundle/);
    await rm(resolve(source, 'escape'));
    await symlink('.', resolve(source, 'loop'));
    await assert.rejects(stageDelivery(family, 'macos', source), /directory cycle/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(resolve(ROOT, 'artifacts/delivery', family), { recursive: true, force: true });
  }
});
