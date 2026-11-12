import copy
import gzip
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('apk_assembly', Path(__file__).parents[1] / 'application-remote-assembly.py')
apk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(apk)


class ExactApkAssembly(unittest.TestCase):
    def fixture(self, root, repository=None):
        root = Path(root)
        base_directory, apps = root / 'bases', root / 'apps'
        base_directory.mkdir()
        apps.mkdir()
        libraries = {'jni/arm64-v8a/libweapp_container_sdk.so': b'first native fixture\0' * 70000,
                     'jni/x86_64/libweapp_container_sdk.so': b'second native fixture\0' * 70000}
        aar_bytes = io.BytesIO()
        with zipfile.ZipFile(aar_bytes, 'w') as archive:
            for name, data in libraries.items():
                archive.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)
        aar = aar_bytes.getvalue()
        member = 'maven/reviewed.aar'
        base_path = base_directory / 'sealed-android.tar.gz'
        with tarfile.open(base_path, 'w:gz') as archive:
            info = tarfile.TarInfo(member)
            info.size = len(aar)
            archive.addfile(info, io.BytesIO(aar))
        base = {'id': 'android', 'fileName': base_path.name, 'size': base_path.stat().st_size, 'sha256': apk.sdk.file_digest(base_path),
                'files': [{'path': member, 'size': len(aar), 'sha256': apk.digest(aar)}], 'packRoot': 'a' * 64, 'policySha256': 'b' * 64}
        app = apps / 'showcase-inert-signed.apk'
        with zipfile.ZipFile(app, 'w') as archive:
            archive.comment = b'opaque original signing-related fixture bytes must be preserved'
            for name, data in libraries.items():
                archive.writestr(name.replace('jni/', 'lib/'), data)
            archive.writestr('classes.dex', b'inert consumer bytecode fixture', compress_type=zipfile.ZIP_DEFLATED)
        target = {'kind': 'showcase-application/1', 'platform': 'android', 'family': 'native', 'profile': 'restricted-showcase',
                  'repository': repository or apk.sdk.REPOSITORY, 'releaseTag': apk.sdk.RELEASE_TAG, 'fileName': app.name, 'size': app.stat().st_size,
                  'sha256': apk.sdk.file_digest(app), 'packRoot': base['packRoot'], 'policySha256': base['policySha256']}
        sidecar = app.with_suffix('.apk.json')
        sidecar.write_text(json.dumps(target, indent=2) + '\n')
        prepared = apk.prepare(sidecar, {'artifacts': [base]}, base_directory, root / 'recipe')
        return root, base_directory, app, sidecar, prepared

    def test_preserves_original_zip_ranges_and_every_attachment_exactly(self):
        with tempfile.TemporaryDirectory() as temporary:
            root, bases, app, sidecar, prepared = self.fixture(temporary)
            self.assertGreater(prepared['projectedBytes'], 2 * 1024 ** 2)
            self.assertLess(prepared['deltaBytes'], 4096)
            result = apk.assemble(prepared['recipe'], prepared['recipeSha256'], root / 'out', bases)
            self.assertEqual(result['status'], 'reassembled-exact')
            self.assertEqual((root / 'out' / app.name).read_bytes(), app.read_bytes())
            self.assertEqual((root / 'out' / sidecar.name).read_bytes(), sidecar.read_bytes())

    def test_wrong_projection_and_target_identity_cannot_publish(self):
        for mutate in [lambda recipe: recipe['pieces'][1].update(sha256='f' * 64),
                       lambda recipe: recipe['target'].update(sha256='f' * 64),
                       lambda recipe: recipe['pieces'][0].update(path='../escape')]:
            with tempfile.TemporaryDirectory() as temporary:
                root, bases, app, sidecar, prepared = self.fixture(temporary)
                recipe = json.loads(gzip.decompress(Path(prepared['recipe']).read_bytes()))
                mutate(recipe)
                bad = root / 'bad.json.gz'
                bad.write_bytes(gzip.compress(json.dumps(recipe).encode()))
                with self.assertRaises((ValueError, KeyError)):
                    apk.assemble(bad, apk.sdk.file_digest(bad), root / 'out', bases)

    def test_original_showcase_descriptor_and_recipe_preserve_all_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root, bases, app, sidecar, prepared = self.fixture(temporary, 'weapp-container/showcase')
            recipe = json.loads(gzip.decompress(Path(prepared['recipe']).read_bytes()))
            self.assertEqual(recipe['repository'], apk.sdk.REPOSITORY)
            recipe['repository'] = 'weapp-container/showcase'
            path = Path(prepared['recipe'])
            path.write_bytes(gzip.compress(json.dumps(recipe).encode()))
            apk.assemble(path, apk.sdk.file_digest(path), root / 'out', bases)
            self.assertEqual((root / 'out' / app.name).read_bytes(), app.read_bytes())
            self.assertEqual((root / 'out' / sidecar.name).read_bytes(), sidecar.read_bytes())

    def test_foreign_manifest_repository_is_rejected_at_each_boundary(self):
        for repository in ('unreviewed/website', apk.sdk.STORAGE_REPOSITORY):
            with tempfile.TemporaryDirectory() as temporary:
                root, bases, app, sidecar, prepared = self.fixture(temporary)
                descriptor = json.loads(sidecar.read_text())
                descriptor['repository'] = repository
                sidecar.write_text(json.dumps(descriptor))
                with self.assertRaisesRegex(ValueError, 'Unexpected private application release'):
                    apk.prepare(sidecar, {'artifacts': []}, bases, root / 'rejected')
                original = json.loads(gzip.decompress(Path(prepared['recipe']).read_bytes()))
                for field in ('recipe', 'target'):
                    recipe = copy.deepcopy(original)
                    (recipe if field == 'recipe' else recipe['target'])['repository'] = repository
                    path = root / 'bad.json.gz'
                    path.write_bytes(gzip.compress(json.dumps(recipe).encode()))
                    with self.assertRaisesRegex(ValueError, 'release mismatch|policy identity differs'):
                        apk.assemble(path, apk.sdk.file_digest(path), root / 'out', bases)

    def test_historical_upload_is_rejected_before_reading_any_file(self):
        with self.assertRaisesRegex(ValueError, 'Historical releases are read-only'):
            apk.assemble('missing', '0' * 64, 'unused', upload=True)

    def test_changed_base_or_delta_rejected_before_reconstruction(self):
        for which in ('base', 'delta'):
            with tempfile.TemporaryDirectory() as temporary:
                root, bases, app, sidecar, prepared = self.fixture(temporary)
                path = next(bases.iterdir()) if which == 'base' else Path(prepared['delta'])
                path.write_bytes(path.read_bytes() + b'changed')
                with self.assertRaises(ValueError):
                    apk.assemble(prepared['recipe'], prepared['recipeSha256'], root / 'out', bases)


if __name__ == '__main__':
    unittest.main()
