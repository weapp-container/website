import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

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

    def test_original_showcase_lock_and_recipe_preserve_archive_bytes(self):
        self.lock['repository'] = 'weapp-container/showcase'
        prepared = assembly.prepare_recipe(self.lock, self.target['id'], self.archives, self.root / 'legacy-recipe')
        path = Path(prepared['recipe'])
        recipe = json.loads(path.read_text())
        self.assertEqual(recipe['repository'], assembly.REPOSITORY)
        recipe['repository'] = self.lock['repository']
        path.write_text(json.dumps(recipe))
        result = self.reassemble(path, assembly.file_digest(path))
        self.assertEqual(result['sha256'], self.target['sha256'])
        self.assertEqual((self.root / 'result' / self.target['fileName']).read_bytes(), (self.archives / self.target['fileName']).read_bytes())

    def test_foreign_or_storage_repository_cannot_override_manifest_identity(self):
        for repository in ('unreviewed/website', assembly.STORAGE_REPOSITORY):
            with self.subTest(repository=repository):
                self.lock['repository'] = repository
                with self.assertRaisesRegex(ValueError, 'Unexpected private release'):
                    assembly.prepare_recipe(self.lock, self.target['id'], self.archives, self.root / 'rejected')
                path = Path(self.prepared['recipe'])
                recipe = json.loads(path.read_text())
                recipe['repository'] = repository
                path.write_text(json.dumps(recipe))
                with self.assertRaisesRegex(ValueError, 'Assembly release mismatch'):
                    self.reassemble(path, assembly.file_digest(path))

    def test_network_download_uses_only_frozen_private_storage(self):
        current = {'draft': True, 'tag_name': assembly.RELEASE_TAG, 'assets': [
            {'name': self.target['fileName'], 'state': 'uploaded', 'size': self.target['size'], 'digest': 'sha256:' + self.target['sha256']}]}
        with patch.object(assembly.subprocess, 'check_output', side_effect=[
                json.dumps({'private': True, 'full_name': assembly.STORAGE_REPOSITORY}).encode(), json.dumps(current).encode()]) as api:
            self.assertEqual(assembly.release(), current)
            self.assertEqual(api.call_args_list[0].args[0], ['gh', 'api', 'repos/' + assembly.STORAGE_REPOSITORY])
            self.assertEqual(api.call_args_list[1].args[0], ['gh', 'api', 'repos/' + assembly.STORAGE_REPOSITORY + '/releases/' + str(assembly.RELEASE_ID)])
        with patch.object(assembly.subprocess, 'run') as download:
            assembly.download(self.target, self.archives, current)
            download.assert_called_once_with(['gh', 'release', 'download', assembly.RELEASE_TAG, '--repo', assembly.STORAGE_REPOSITORY,
                                              '--pattern', self.target['fileName'], '--dir', str(self.archives)], check=True)

    def test_historical_upload_is_rejected_before_reading_or_network(self):
        with patch.object(assembly.subprocess, 'run') as network:
            with self.assertRaisesRegex(ValueError, 'Historical releases are read-only'):
                assembly.assemble(self.root / 'missing', '0' * 64, self.root / 'out', upload=True)
            network.assert_not_called()

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
