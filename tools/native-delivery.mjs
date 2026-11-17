import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, readlink, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, resolve, sep } from 'node:path';
import { ROOT, run } from './sdk-install.mjs';
export async function stageDelivery(family, platform, source) {
  const sourceInfo = await lstat(source);
  assert.ok(sourceInfo.isFile() || sourceInfo.isDirectory(), 'Application root must be a regular file or directory');
  const checkLinks = async root => {
    const canonicalRoot = await realpath(root);
    const visit = async (path, ancestors = new Set()) => {
      const info = await lstat(path);
      if (info.isSymbolicLink()) {
        const link = await readlink(path), canonical = await realpath(path);
        assert.ok(!isAbsolute(link) && !link.includes('\\'), 'Application links must remain relative');
        assert.ok(canonical === canonicalRoot || canonical.startsWith(canonicalRoot + sep), 'Application link escapes its bundle');
      }
      if ((await stat(path)).isDirectory()) {
        const canonical = await realpath(path);
        assert.ok(!ancestors.has(canonical), 'Application link forms a directory cycle');
        const nested = new Set(ancestors); nested.add(canonical);
        for (const entry of await readdir(path)) await visit(resolve(path, entry), nested);
      }
    };
    await visit(root);
  };
  await checkLinks(source);
  const destination = resolve(ROOT, 'artifacts/delivery', family, platform);
  await rm(destination, { recursive: true, force: true }); await mkdir(destination, { recursive: true });
  const target = resolve(destination, basename(source));
  // Node otherwise rewrites framework-relative links into absolute build paths.
  await cp(source, target, { recursive: true, verbatimSymlinks: true, filter: path => !/(?:\.dSYM|\.symbols|\.pdb|\.map|\.ilk|\.exp|\.lib)$/.test(path) });
  await checkLinks(target);
  const files = [];
  const inventory = async (path, relative = '') => {
    const info = await stat(path);
    if (info.isDirectory()) for (const entry of await readdir(path)) await inventory(resolve(path, entry), relative ? `${relative}/${entry}` : entry);
    else { const bytes = await readFile(path); files.push({ path: relative || basename(path), size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
  };
  await inventory(target, basename(target));
  await writeFile(resolve(destination, 'files.json'), JSON.stringify(files, null, 2) + '\n');
  return { path: destination, files: files.length };
}
export async function verifyAndroidApk(apk) {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  assert.ok(sdk, 'Set ANDROID_HOME for APK signature and ZIP verification');
  const versions = (await readdir(resolve(sdk, 'build-tools'))).sort((a,b) => b.localeCompare(a,undefined,{numeric:true}));
  assert.ok(versions.length > 0);
  const tools = resolve(sdk,'build-tools',versions[0]);
  const result = await run(resolve(tools, process.platform === 'win32' ? 'apksigner.bat' : 'apksigner'), ['verify','--verbose','--print-certs',apk]);
  assert.match(result, /Verified using v[234]/); const certificateSha256 = result.match(/certificate SHA-256 digest: ([a-f0-9]+)/i)?.[1];
  assert.match(certificateSha256 || '', /^[a-f0-9]{64}$/);
  await run(resolve(tools, process.platform === 'win32' ? 'zipalign.exe' : 'zipalign'), ['-c','-P','16','4',apk]);
  return { verified: true, certificateSha256, zipAlignment: '16KiB-native-library-compatible' };
}
export async function verifyAndroidRuntime(apk, sdkDirectory, installation) {
  const archives=installation.files.filter(file=>file.path.endsWith('.aar')).map(file=>resolve(sdkDirectory,file.path));
  assert.ok(archives.length>0,'The installed SDK has no reviewed Android AAR');
  return JSON.parse(await run(process.env.PYTHON||'python3',['-c',`import hashlib,json,sys,zipfile
expected={}
for path in json.loads(sys.argv[2]):
 with zipfile.ZipFile(path) as archive:
  for name in archive.namelist():
   if name.startswith('jni/') and name.endswith('/libweapp_container_sdk.so'):
    data=archive.read(name);key=name.replace('jni/','lib/',1);item={'path':key,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    if key in expected and expected[key]!=item:raise ValueError('Conflicting reviewed Android native cores')
    expected[key]=item
if not expected:raise ValueError('Reviewed SDK has no Android native core')
with zipfile.ZipFile(sys.argv[1]) as archive:
 for name,item in expected.items():
  if archive.namelist().count(name)!=1:raise ValueError('Missing/duplicate packaged Android native core')
  data=archive.read(name)
  if len(data)!=item['size'] or hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Application changed reviewed Android native core bytes')
print(json.dumps({'byteIdentical':True,'libraries':list(expected.values())}))`,apk,JSON.stringify(archives)]));
}
