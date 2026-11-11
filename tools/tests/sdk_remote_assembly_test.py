import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('assembly', Path(__file__).resolve().parents[1] / 'sdk-remote-assembly.py')
assembly = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assembly)


class AssemblyTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.archives = self.root / 'archives'
        self.archives.mkdir()
        shared = b'reviewed native binary\0' * 5000
        self.bases = [self.archive(identity, {'runtime.bin': shared, 'license.txt': b'license'}) for identity in ['android', 'ios', 'desktop/macos']]
        self.target = self.archive('react-native/android-ios', {'native/' + 'long/' * 25 + 'runtime.bin': shared, 'wrapper.js': b'export const value = 42;\n', 'notice.txt': b'license'})
        self.lock = {'repository': assembly.REPOSITORY, 'releaseTag': assembly.RELEASE_TAG, 'artifacts': self.bases + [self.target]}
        self.prepared = assembly.prepare_recipe(self.lock, self.target['id'], self.archives, self.root / 'recipe')

    def archive(self, identity, files):
        path = self.archives / (identity.replace('/', '-') + '.tar.gz')
        with path.open('wb') as raw:
            with gzip.GzipFile(fileobj=raw, mode='wb', filename='', mtime=0) as compressed:
                with tarfile.open(fileobj=compressed, mode='w') as tar:
                    for name, content in files.items():
                        info = tarfile.TarInfo(name)
                        info.size, info.mode = len(content), 0o644
                        tar.addfile(info, io.BytesIO(content))
        return {'id': identity, 'fileName': path.name, 'size': path.stat().st_size, 'sha256': assembly.file_digest(path),
                'files': [{'path': name, 'size': len(content), 'sha256': hashlib.sha256(content).hexdigest()} for name, content in files.items()]}

    def reassemble(self, recipe=None, recipe_hash=None):
        return assembly.assemble(recipe or self.prepared['recipe'], recipe_hash or self.prepared['recipeSha256'], self.root / 'result', self.archives)

    def test_reconstructs_original_tar_headers_pax_and_gzip_bytes(self):
        result = self.reassemble()
        self.assertEqual(result['sha256'], self.target['sha256'])
        self.assertTrue(result['originalArchiveBytesPreserved'])
        self.assertEqual(self.prepared['projectedFiles'], 2)
        self.assertEqual((self.root / 'result' / self.target['fileName']).read_bytes(), (self.archives / self.target['fileName']).read_bytes())

    def test_packed_recipe_keeps_the_same_original_archive_bytes(self):
        result = self.reassemble(self.prepared['packedRecipe'], self.prepared['packedRecipeSha256'])
        self.assertEqual(result['sha256'], self.target['sha256'])

    def test_recipe_hash_and_native_asset_corruption_fail_closed(self):
        with self.assertRaisesRegex(ValueError, 'size/hash mismatch'):
            self.reassemble(recipe_hash='0' * 64)
        base = self.archives / self.bases[0]['fileName']
        base.write_bytes(base.read_bytes()[:-1] + b'x')
        with self.assertRaisesRegex(ValueError, 'size/hash mismatch'):
            self.reassemble()

    def test_projection_cannot_escape_or_substitute_another_native_source(self):
        path = Path(self.prepared['recipe'])
        recipe = json.loads(path.read_text())
        recipe['tar']['pieces'][0]['source']['path'] = '../runtime.bin'
        path.write_text(json.dumps(recipe))
        with self.assertRaisesRegex(ValueError, 'Unsafe artifact path'):
            self.reassemble(recipe_hash=assembly.file_digest(path))

    def test_wrong_compression_environment_cannot_publish_a_different_archive(self):
        path = Path(self.prepared['recipe'])
        recipe = json.loads(path.read_text())
        recipe['compression']['zlib'] = 'other'
        path.write_text(json.dumps(recipe))
        with self.assertRaisesRegex(ValueError, 'Exact producer Python/zlib'):
            self.reassemble(recipe_hash=assembly.file_digest(path))


if __name__ == '__main__':
    unittest.main()
