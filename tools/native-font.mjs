import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from './sdk-install.mjs';

export const FONT_FILES = Object.freeze([
  { path: 'NotoSansSC.ttf', size: 17772300, sha256: 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da' },
  { path: 'OFL.txt', size: 4388, sha256: '1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9' },
]);
export async function verifyFonts(directory) {
  for (const file of FONT_FILES) {
    assert.ok((await lstat(resolve(directory, file.path))).isFile(), 'Font input must be a regular file');
    const bytes = await readFile(resolve(directory, file.path));
    assert.equal(bytes.length, file.size, `Reviewed font size differs: ${file.path}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `Reviewed font digest differs: ${file.path}`);
  }
  return FONT_FILES;
}
export async function stageFonts(source = resolve(ROOT, 'artifacts/miniapp/fonts')) {
  await verifyFonts(source);
  const destination = resolve(ROOT, '.runtime/fonts'); await mkdir(destination, { recursive: true });
  for (const file of FONT_FILES) await cp(resolve(source, file.path), resolve(destination, file.path));
  await verifyFonts(destination);
  return { directory: destination, files: FONT_FILES };
}
