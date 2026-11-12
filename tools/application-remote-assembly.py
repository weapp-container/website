#!/usr/bin/env python3
"""Project unchanged stored APK library ranges from a verified private SDK."""
import argparse
import base64
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import struct
import subprocess
import tarfile
import tempfile
import zipfile

spec = importlib.util.spec_from_file_location('sdk_assembly', Path(__file__).with_name('sdk-remote-assembly.py'))
sdk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sdk)
require, digest, checked_file = sdk.require, sdk.digest, sdk.checked_file
LIMIT = 512 * 1024 ** 2


def zip_inventory(path):
    result, seen, expanded = [], set(), 0
    with zipfile.ZipFile(path) as archive:
        for item in archive.infolist():
            # Android's fixed public Gradle metadata path contains "build";
            # it is part of the APK format, not a source/cache directory.
            name = item.filename if item.filename == 'META-INF/com/android/build/gradle/app-metadata.properties' else sdk.safe_path(item.filename)
            require(name not in seen and not item.flag_bits & 1 and item.compress_type in (0, 8), 'Invalid APK entry')
            require(item.file_size <= LIMIT and not item.is_dir(), 'APK entries must be bounded regular files')
            seen.add(name)
            expanded += item.file_size
            require(len(seen) <= 30000 and expanded <= 2 * LIMIT, 'APK expanded byte limit exceeded')
            data = archive.read(item)
            result.append({'path': name, 'size': len(data), 'sha256': digest(data)})
    return result


def sources(archive, entry):
    """Validate the complete sealed base before reading its nested Android AAR."""
    found = {}
    with tempfile.TemporaryDirectory(prefix='apk-base-') as temporary:
        root = Path(temporary) / 'sdk'
        sdk.extract_checked(archive, entry, root)
        for file in entry['files']:
            if not file['path'].endswith('.aar'):
                continue
            with zipfile.ZipFile(root / file['path']) as aar:
                require(len(aar.infolist()) < 30000, 'Oversized source AAR')
                for member in aar.infolist():
                    if member.filename.startswith('jni/') and member.filename.endswith('/libweapp_container_sdk.so'):
                        sdk.safe_path(member.filename)
                        require(member.file_size <= LIMIT and not member.flag_bits & 1, 'Invalid source native library')
                        data = aar.read(member)
                        key = digest(data)
                        require(key not in found, 'Duplicate source native core')
                        found[key] = {'archive': file['path'], 'member': member.filename, 'size': len(data), 'sha256': key, 'data': data}
    require(len(found) == 2, 'Require the exact two reviewed Android runtime slices')
    return found


def prepare(sidecar, lock, archive_directory, out):
    sidecar = Path(sidecar)
    target = json.loads(sidecar.read_text())
    require(target['kind'] == 'showcase-application/1' and target['platform'] == 'android', 'Expected sealed Android application')
    require(target['family'] in ('native', 'react-native', 'flutter') and target['profile'] == 'restricted-showcase', 'Invalid application family/profile')
    require(target['repository'] == sdk.REPOSITORY and target['releaseTag'] == sdk.RELEASE_TAG, 'Unexpected private application release')
    sdk.filename(target['fileName'])
    apk = sidecar.parent / target['fileName']
    checked_file(apk, target)
    bases = [entry for entry in lock['artifacts'] if entry['id'] == 'android']
    require(len(bases) == 1 and bases[0]['packRoot'] == target['packRoot'] and bases[0]['policySha256'] == target['policySha256'], 'Base SDK policy identity differs')
    base = bases[0]
    catalog = sources(Path(archive_directory) / base['fileName'], base)
    original = apk.read_bytes()
    intervals = []
    with zipfile.ZipFile(apk) as archive:
        for item in archive.infolist():
            if item.compress_type != zipfile.ZIP_STORED or item.file_size < 1024 * 1024:
                continue
            data = archive.read(item)
            provider = catalog.get(digest(data))
            if not provider or len(data) != provider['size']:
                continue
            at = item.header_offset
            require(original[at:at + 4] == b'PK\x03\x04', 'Invalid APK local header')
            name_length, extra_length = struct.unpack_from('<HH', original, at + 26)
            start = at + 30 + name_length + extra_length
            require(original[start:start + len(data)] == data, 'Stored APK range differs from decoded library')
            intervals.append((start, start + len(data), provider))
    require(len(intervals) == 2, 'APK must preserve both exact reviewed native runtime slices')
    pieces, delta_files, cursor = [], {}, 0
    def delta(data):
        key = 'blobs/' + digest(data)
        delta_files[key] = data
        return {'source': 'delta', 'path': key, 'size': len(data), 'sha256': digest(data)}
    for start, end, provider in sorted(intervals):
        require(start >= cursor, 'Overlapping APK native ranges')
        if start > cursor:
            pieces.append(delta(original[cursor:start]))
        pieces.append({key: provider[key] for key in ('archive', 'member', 'size', 'sha256')} | {'source': 'android'})
        cursor = end
    if cursor < len(original):
        pieces.append(delta(original[cursor:]))
    attachments = []
    for path in [sidecar] + ([sidecar.parent / target['notices']['fileName']] if target.get('notices') else []):
        data = path.read_bytes()
        if path != sidecar:
            checked_file(path, target['notices'])
        attachments.append({'fileName': sdk.filename(path.name), **delta(data)})
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    stem = target['family'] + '-' + target['sha256'][:12]
    delta_path = out / ('showcase-apk-delta-' + stem + '.tar.gz')
    with delta_path.open('xb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', filename='', mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode='w') as archive:
                for name, data in sorted(delta_files.items()):
                    info = tarfile.TarInfo(name)
                    info.size, info.mode = len(data), 0o644
                    archive.addfile(info, io.BytesIO(data))
    recipe = {'schemaVersion': 1, 'kind': 'showcase-apk-exact-range-assembly', 'repository': sdk.REPOSITORY,
              'releaseId': sdk.RELEASE_ID, 'releaseTag': sdk.RELEASE_TAG, 'base': base, 'target': target,
              'pieces': pieces, 'attachments': attachments, 'apkInventory': zip_inventory(apk),
              'delta': {'fileName': delta_path.name, 'size': delta_path.stat().st_size, 'sha256': sdk.file_digest(delta_path),
                        'files': [{'path': name, 'size': len(data), 'sha256': digest(data)} for name, data in sorted(delta_files.items())]}}
    recipe_path = out / ('showcase-apk-assembly-' + stem + '.json.gz')
    with recipe_path.open('xb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', filename='', mtime=0) as compressed:
            compressed.write(json.dumps(recipe, sort_keys=True, separators=(',', ':')).encode())
    result = {'recipe': str(recipe_path), 'recipeSha256': sdk.file_digest(recipe_path), 'delta': str(delta_path), 'deltaSha256': recipe['delta']['sha256'],
              'deltaBytes': recipe['delta']['size'], 'projectedBytes': sum(piece['size'] for piece in pieces if piece['source'] != 'delta'),
              'target': target['fileName'], 'targetSha256': target['sha256']}
    (out / 'prepared.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def assemble(recipe_path, recipe_sha256, destination, offline=None, upload=False):
    require(not upload, 'Historical releases are read-only; publish a new reviewed release instead')
    recipe_path = Path(recipe_path)
    checked_file(recipe_path, {'size': recipe_path.stat().st_size, 'sha256': recipe_sha256})
    require(recipe_path.stat().st_size <= 4 * 1024 ** 2, 'APK recipe exceeds bound')
    with gzip.open(recipe_path, 'rb') as stream:
        raw = stream.read(16 * 1024 ** 2 + 1)
    require(len(raw) <= 16 * 1024 ** 2, 'Expanded recipe exceeds bound')
    recipe = json.loads(raw)
    require(recipe['schemaVersion'] == 1 and recipe['kind'] == 'showcase-apk-exact-range-assembly', 'Invalid APK assembly contract')
    require(recipe['repository'] == sdk.REPOSITORY and recipe['releaseId'] == sdk.RELEASE_ID and recipe['releaseTag'] == sdk.RELEASE_TAG, 'Private release mismatch')
    target, base, delta = recipe['target'], recipe['base'], recipe['delta']
    require(target['repository'] == sdk.REPOSITORY and target['releaseTag'] == sdk.RELEASE_TAG and target['platform'] == 'android'
            and target['profile'] == 'restricted-showcase' and target['packRoot'] == base['packRoot'] and target['policySha256'] == base['policySha256'], 'Application policy identity differs')
    require(0 < target['size'] <= LIMIT and 0 < len(recipe['pieces']) <= 20, 'APK assembly size/piece bound exceeded')
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    current = None if offline else sdk.release()
    with tempfile.TemporaryDirectory(prefix='apk-assembly-') as temporary:
        work = Path(temporary)
        base_path = Path(offline) / sdk.filename(base['fileName']) if offline else sdk.download(base, work, current)
        catalog = sources(base_path, base)
        delta_path = recipe_path.parent / sdk.filename(delta['fileName']) if offline else sdk.download(delta, work, current)
        delta_root = work / 'delta'
        sdk.extract_checked(delta_path, delta, delta_root)
        delta_inventory = sdk.inventory(delta['files'])
        def resolve_piece(piece):
            require(0 <= piece['size'] <= LIMIT, 'Piece size exceeds bound')
            if piece['source'] == 'android':
                source = catalog.get(piece['sha256'])
                require(source and all(source[key] == piece[key] for key in ('archive', 'member', 'size', 'sha256')), 'Native projection differs from verified base')
                data = source['data']
            else:
                require(piece['source'] == 'delta', 'Unsupported source')
                path = sdk.safe_path(piece['path'])
                require(path in delta_inventory, 'Unlisted delta range')
                data = (delta_root / path).read_bytes()
            require(len(data) == piece['size'] and digest(data) == piece['sha256'], 'APK range hash differs')
            return data
        output = destination / sdk.filename(target['fileName'])
        with output.open('xb') as stream:
            total = 0
            for piece in recipe['pieces']:
                data = resolve_piece(piece)
                total += len(data)
                require(total <= target['size'], 'APK assembled bytes exceed target')
                stream.write(data)
        checked_file(output, target)
        require(zip_inventory(output) == recipe['apkInventory'], 'Reconstructed APK ZIP closure differs')
        published = [output]
        require(len(recipe['attachments']) in (1, 2), 'Invalid application attachment closure')
        for attachment in recipe['attachments']:
            path = destination / sdk.filename(attachment['fileName'])
            require(path != output, 'Attachment collides with APK')
            path.write_bytes(resolve_piece(attachment))
            published.append(path)
        descriptor_path = destination / (target['fileName'] + '.json')
        require(json.loads(descriptor_path.read_bytes()) == target, 'Original application descriptor differs')
        if target.get('notices'):
            checked_file(destination / sdk.filename(target['notices']['fileName']), target['notices'])
        result = {'schemaVersion': 1, 'status': 'reassembled-exact', 'recipeSha256': recipe_sha256, 'fileName': target['fileName'],
                  'size': target['size'], 'sha256': target['sha256'], 'apkEntriesVerified': len(recipe['apkInventory']),
                  'originalApkBytesAndSigningBlockPreserved': True, 'assets': []}
        if upload:
            require(not offline, 'Offline assembly cannot publish')
            for path in published:
                entry = {'fileName': path.name, 'size': path.stat().st_size, 'sha256': sdk.file_digest(path)}
                matches = [a for a in sdk.release()['assets'] if a['name'] == path.name]
                if not matches:
                    subprocess.run(['gh', 'release', 'upload', sdk.RELEASE_TAG, str(path), '--repo', sdk.REPOSITORY], check=True)
                    matches = [a for a in sdk.release()['assets'] if a['name'] == path.name]
                require(len(matches) == 1 and matches[0]['state'] == 'uploaded' and matches[0]['size'] == entry['size'] and matches[0]['digest'] == 'sha256:' + entry['sha256'], 'Immutable published application differs')
                result['assets'].append(entry | {'assetId': matches[0]['id'], 'serverDigest': matches[0]['digest']})
            result['status'] = 'published-exact-verified'
        (destination / 'assembly-result.json').write_text(json.dumps(result, indent=2) + '\n')
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    prepare_command = commands.add_parser('prepare')
    prepare_command.add_argument('--sidecar', required=True)
    prepare_command.add_argument('--manifest', default=str(sdk.ROOT / 'platforms/sdk-artifacts.lock.json'))
    prepare_command.add_argument('--archive-dir', default=str(sdk.ROOT / 'artifacts/private/sdk'))
    prepare_command.add_argument('--out', required=True)
    assemble_command = commands.add_parser('assemble')
    assemble_command.add_argument('--recipe', required=True)
    assemble_command.add_argument('--recipe-sha256', required=True)
    assemble_command.add_argument('--destination', required=True)
    assemble_command.add_argument('--offline')
    assemble_command.add_argument('--upload', action='store_true')
    args = parser.parse_args()
    result = prepare(args.sidecar, json.loads(Path(args.manifest).read_text()), args.archive_dir, args.out) if args.command == 'prepare' else assemble(args.recipe, args.recipe_sha256, args.destination, args.offline, args.upload)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
