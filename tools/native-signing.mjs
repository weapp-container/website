import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, chmod, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, ROOT } from './sdk-install.mjs';
export async function signingEnvironment() {
  if (['SHOWCASE_KEYSTORE', 'SHOWCASE_STORE_PASSWORD', 'SHOWCASE_KEY_ALIAS', 'SHOWCASE_KEY_PASSWORD'].every(key => process.env[key])) return {};
  const value = JSON.parse(await readFile(resolve(ROOT, '.private/signing/config.json'), 'utf8'));
  assert.ok(value.storeFile && value.storePassword && value.keyAlias && value.keyPassword, 'Incomplete private signing configuration');
  return { SHOWCASE_KEYSTORE: value.storeFile, SHOWCASE_STORE_PASSWORD: value.storePassword, SHOWCASE_KEY_ALIAS: value.keyAlias, SHOWCASE_KEY_PASSWORD: value.keyPassword };
}
export async function createSigning() {
  const directory = resolve(ROOT, '.private/signing'); await mkdir(directory, { recursive: true, mode: 0o700 });
  const storeFile = resolve(directory, 'showcase-release.jks'), configuration = resolve(directory, 'config.json');
  for (const path of [storeFile, configuration]) { try { await access(path); throw Error(`Signing material already exists: ${path}`); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  const password = randomBytes(32).toString('base64url'), keyAlias = 'container-showcase-release';
  await run('keytool', ['-genkeypair', '-keystore', storeFile, '-storetype', 'JKS', '-alias', keyAlias, '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-storepass:env', 'SHOWCASE_GENERATED_STORE_PASSWORD', '-keypass:env', 'SHOWCASE_GENERATED_KEY_PASSWORD', '-dname', 'CN=Weapp Container Showcase,OU=Showcase,O=Weapp Container,C=CN'], { env: { ...process.env, SHOWCASE_GENERATED_STORE_PASSWORD: password, SHOWCASE_GENERATED_KEY_PASSWORD: password } });
  await chmod(storeFile, 0o600);
  await writeFile(configuration, JSON.stringify({ storeFile, storePassword: password, keyAlias, keyPassword: password }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { status: 'created', keystore: storeFile, configuration, qualification: 'Back up private signing material securely; it is excluded from releases and Git' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { assert.deepEqual(process.argv.slice(2), ['--create']); console.log(JSON.stringify(await createSigning())); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
