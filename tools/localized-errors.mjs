import {copyFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Workers Assets resolves the nearest ancestor 404.html. Astro gives nested
// error pages regular directory routes, so retain that route and emit the
// language-specific error document alongside it.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await copyFile(resolve(root, 'dist/en/404/index.html'), resolve(root, 'dist/en/404.html'));
