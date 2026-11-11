#!/usr/bin/env python3
"""Reassemble an already sealed SDK from verified release assets and a small delta."""
import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import tempfile
import zlib

ROOT = Path(__file__).resolve().parent.parent
REPOSITORY = 'weapp-container/showcase'
RELEASE_ID = 435160337
RELEASE_TAG = 'showcase-v0.1.0-preview.6.0-candidate3'
LIMIT = 2 * 1024 ** 3


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_digest(path):
    value = hashlib.sha256()
    with Path(path).open('rb') as content:
        for block in iter(lambda: content.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def safe_path(value):
    require(isinstance(value, str) and 0 < len(value) < 1024, 'Invalid artifact path')
    require(not value.startswith('/') and not re.search(r'[\\:\x00-\x20\x7f]', value), 'Unsafe artifact path')
    require(all(part not in ('', '.', '..') for part in value.split('/')), 'Unsafe artifact path')
    require(not any(part in {'.git', '.private', 'source', 'crates', 'cargo-target', 'target', 'build', '.gradle', '.cxx'} or part.endswith('.dSYM') for part in value.split('/'))
            and not value.endswith(('.rs', '.pdb', '.map', '.debug', '.symbols', 'Cargo.toml')), 'Private/intermediate source in artifact path')
    return value


def filename(value):
    safe_path(value)
    require(re.fullmatch('[a-zA-Z0-9._-]+', value) is not None, 'Asset name must be a literal basename')
    return value


def checked_file(path, entry):
    path = Path(path)
    require(path.is_file() and not path.is_symlink(), 'Artifact must be a regular file')
    require(path.stat().st_size == entry['size'] and file_digest(path) == entry['sha256'], 'Artifact size/hash mismatch: ' + path.name)


def inventory(entries):
    require(isinstance(entries, list) and 0 < len(entries) <= 30000, 'Invalid file inventory')
    result = {}
    for entry in entries:
        path = safe_path(entry['path'])
        require(path not in result and isinstance(entry['size'], int) and 0 <= entry['size'] <= 512 * 1024 ** 2, 'Invalid or duplicate inventory member')
        require(re.fullmatch('[a-f0-9]{64}', entry['sha256']) is not None, 'Invalid member hash')
        result[path] = entry
    require(sum(entry['size'] for entry in entries) <= LIMIT, 'Inventory exceeds byte limit')
    return result


def extract_checked(archive_path, entry, destination):
    checked_file(archive_path, entry)
    expected = inventory(entry['files'])
    seen = set()
    destination = Path(destination)
    destination.mkdir()
    with tarfile.open(archive_path, 'r:gz') as archive:
        for member in archive:
            path = safe_path(member.name)
            require(member.isfile() and path in expected and path not in seen, 'Unreviewed archive member/link')
            wanted = expected[path]
            require(member.size == wanted['size'], 'Archive member size mismatch')
            target = destination / path
            target.parent.mkdir(parents=True, exist_ok=True)
            value = hashlib.sha256()
            with archive.extractfile(member) as source, target.open('xb') as output:
                for block in iter(lambda: source.read(1024 * 1024), b''):
                    value.update(block)
                    output.write(block)
            require(value.hexdigest() == wanted['sha256'], 'Archive member digest mismatch')
            seen.add(path)
    require(seen == set(expected), 'Archive inventory is incomplete')


def prepare_recipe(lock, target_id, archive_directory, out, base_ids=None):
    require(lock['repository'] == REPOSITORY and lock['releaseTag'] == RELEASE_TAG, 'Unexpected private release')
    entries = {entry['id']: entry for entry in lock['artifacts']}
    require(len(entries) == len(lock['artifacts']) and target_id in entries, 'Missing/duplicate target')
    target = entries[target_id]
    base_ids = base_ids or ['android', 'ios', 'desktop/macos']
    require(target_id not in base_ids and len(set(base_ids)) == len(base_ids), 'Invalid assembly bases')
    bases = [entries[name] for name in base_ids]
    available = {}
    for entry in bases:
        inventory(entry['files'])
        for item in entry['files']:
            available.setdefault((item['sha256'], item['size']), {'artifact': entry['id'], 'path': item['path']})
    expected = inventory(target['files'])
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    archive_path = Path(archive_directory) / filename(target['fileName'])
    checked_file(archive_path, target)
    stem = target_id.replace('/', '-') + '-' + target['sha256'][:12]
    delta_name = 'showcase-sdk-delta-' + stem + '.tar.gz'
    pieces, delta_files, delta_bytes, seen = [], [], {}, set()
    with tempfile.TemporaryDirectory(prefix='sdk-assembly-') as temporary:
        raw = Path(temporary) / 'original.tar'
        with gzip.open(archive_path, 'rb') as source, raw.open('wb') as destination:
            total = 0
            for block in iter(lambda: source.read(1024 * 1024), b''):
                total += len(block)
                require(total <= LIMIT, 'Target tar exceeds byte limit')
                destination.write(block)
        cursor = 0
        with tarfile.open(raw, 'r:') as archive, raw.open('rb') as stream:
            for member in archive:
                path = safe_path(member.name)
                require(member.isfile() and path in expected and path not in seen, 'Target inventory differs')
                item = expected[path]
                require(member.size == item['size'], 'Target member size differs')
                stream.seek(cursor)
                prefix = stream.read(member.offset_data - cursor)
                require(512 <= len(prefix) <= 4096, 'Unexpected tar header span')
                with archive.extractfile(member) as content:
                    data = content.read()
                require(digest(data) == item['sha256'], 'Target member hash differs')
                provider = available.get((item['sha256'], item['size']))
                if provider is None:
                    blob = 'blobs/' + item['sha256']
                    provider = {'artifact': 'delta', 'path': blob}
                    if blob not in delta_bytes:
                        delta_bytes[blob] = data
                        delta_files.append({'path': blob, 'size': len(data), 'sha256': item['sha256']})
                pieces.append({**item, 'prefixBase64': base64.b64encode(prefix).decode('ascii'), 'source': provider})
                cursor = member.offset_data + member.size
                seen.add(path)
            stream.seek(cursor)
            suffix = stream.read()
        require(seen == set(expected) and 1024 <= len(suffix) <= 20480 and not suffix.strip(b'\0'), 'Invalid target tar closure')
        tar_identity = {'size': raw.stat().st_size, 'sha256': file_digest(raw), 'pieces': pieces, 'suffixBase64': base64.b64encode(suffix).decode('ascii')}
    delta_path = out / delta_name
    with delta_path.open('xb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', filename='', mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode='w') as archive:
                for item in delta_files:
                    info = tarfile.TarInfo(item['path'])
                    info.size, info.mode, info.mtime = item['size'], 0o644, 0
                    archive.addfile(info, io.BytesIO(delta_bytes[item['path']]))
    recipe = {'schemaVersion': 1, 'kind': 'showcase-sdk-remote-assembly', 'repository': REPOSITORY,
              'releaseId': RELEASE_ID, 'releaseTag': RELEASE_TAG,
              'compression': {'python': sys.version.split()[0], 'zlib': zlib.ZLIB_RUNTIME_VERSION},
              'bases': bases, 'target': target, 'tar': tar_identity,
              'delta': {'fileName': delta_name, 'size': delta_path.stat().st_size, 'sha256': file_digest(delta_path), 'files': delta_files}}
    recipe_path = out / ('showcase-sdk-assembly-' + stem + '.json')
    recipe_path.write_text(json.dumps(recipe, sort_keys=True, separators=(',', ':')) + '\n')
    packed_recipe = recipe_path.with_suffix('.json.gz')
    with packed_recipe.open('xb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', filename='', mtime=0) as compressed:
            compressed.write(recipe_path.read_bytes())
    return {'recipe': str(recipe_path), 'recipeSha256': file_digest(recipe_path), 'delta': str(delta_path),
            'packedRecipe': str(packed_recipe), 'packedRecipeSha256': file_digest(packed_recipe),
            'deltaBytes': delta_path.stat().st_size, 'projectedFiles': len(pieces) - sum(piece['source']['artifact'] == 'delta' for piece in pieces),
            'target': target['fileName'], 'targetSha256': target['sha256']}


def release():
    repository = json.loads(subprocess.check_output(['gh', 'api', 'repos/' + REPOSITORY]))
    require(repository['private'] and repository['full_name'] == REPOSITORY, 'SDK assembly requires the private showcase repository')
    value = json.loads(subprocess.check_output(['gh', 'api', 'repos/' + REPOSITORY + '/releases/' + str(RELEASE_ID)]))
    require(value['draft'] and value['tag_name'] == RELEASE_TAG, 'Private candidate release changed')
    return value


def download(entry, directory, current_release):
    name = filename(entry['fileName'])
    matches = [asset for asset in current_release['assets'] if asset['name'] == name]
    require(len(matches) == 1, 'Required release asset is absent or duplicated: ' + name)
    asset = matches[0]
    require(asset['state'] == 'uploaded' and asset['size'] == entry['size'] and asset['digest'] == 'sha256:' + entry['sha256'], 'Release asset identity differs')
    subprocess.run(['gh', 'release', 'download', RELEASE_TAG, '--repo', REPOSITORY, '--pattern', name, '--dir', str(directory)], check=True)
    path = Path(directory) / name
    checked_file(path, entry)
    return path


def assemble(recipe_path, recipe_sha256, destination, offline=None, upload=False):
    require(Path(recipe_path).stat().st_size <= 16 * 1024 ** 2, 'Assembly recipe exceeds byte limit')
    checked_file(recipe_path, {'size': Path(recipe_path).stat().st_size, 'sha256': recipe_sha256})
    if str(recipe_path).endswith('.gz'):
        with gzip.open(recipe_path, 'rb') as content:
            recipe_bytes = content.read(16 * 1024 ** 2 + 1)
        require(len(recipe_bytes) <= 16 * 1024 ** 2, 'Expanded recipe exceeds byte limit')
    else:
        recipe_bytes = Path(recipe_path).read_bytes()
    recipe = json.loads(recipe_bytes)
    require(recipe['schemaVersion'] == 1 and recipe['kind'] == 'showcase-sdk-remote-assembly', 'Unsupported assembly contract')
    require(recipe['repository'] == REPOSITORY and recipe['releaseId'] == RELEASE_ID and recipe['releaseTag'] == RELEASE_TAG, 'Assembly release mismatch')
    require(recipe['compression'] == {'python': sys.version.split()[0], 'zlib': zlib.ZLIB_RUNTIME_VERSION}, 'Exact producer Python/zlib required to preserve archive bytes')
    target = recipe['target']
    expected = inventory(target['files'])
    filename(target['fileName'])
    require(len(recipe['tar']['pieces']) == len(expected), 'Assembly piece count differs')
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    current_release = None if offline else release()
    with tempfile.TemporaryDirectory(prefix='sdk-reassemble-') as temporary:
        work, sources = Path(temporary), {}
        for index, entry in enumerate(recipe['bases'] + [dict(recipe['delta'], id='delta')]):
            identity = entry['id']
            require(identity not in sources, 'Duplicate source identity')
            archive_path = (Path(recipe_path).parent if identity == 'delta' else Path(offline)) / filename(entry['fileName']) if offline else download(entry, work, current_release)
            source = work / ('source-' + str(index))
            extract_checked(archive_path, entry, source)
            sources[identity] = (source, inventory(entry['files']))
        output = destination / target['fileName']
        tar_digest, tar_size, seen = hashlib.sha256(), 0, set()
        with output.open('xb') as raw:
            with gzip.GzipFile(fileobj=raw, mode='wb', filename='', mtime=0) as compressed:
                def emit(data):
                    nonlocal tar_size
                    tar_size += len(data)
                    require(tar_size <= LIMIT, 'Assembly exceeds byte limit')
                    tar_digest.update(data)
                    compressed.write(data)
                for piece in recipe['tar']['pieces']:
                    path = safe_path(piece['path'])
                    require(path in expected and path not in seen, 'Unexpected or duplicate assembly piece')
                    require(all(piece[key] == expected[path][key] for key in ('size', 'sha256')), 'Assembly piece identity differs')
                    provider = piece['source']
                    source_root, source_files = sources[provider['artifact']]
                    source_path = safe_path(provider['path'])
                    require(source_path in source_files and all(source_files[source_path][key] == piece[key] for key in ('size', 'sha256')), 'Projection source identity differs')
                    prefix = base64.b64decode(piece['prefixBase64'], validate=True)
                    require(512 <= len(prefix) <= 4096, 'Invalid assembly tar prefix')
                    emit(prefix)
                    with (source_root / source_path).open('rb') as content:
                        for block in iter(lambda: content.read(1024 * 1024), b''):
                            emit(block)
                    seen.add(path)
                suffix = base64.b64decode(recipe['tar']['suffixBase64'], validate=True)
                require(1024 <= len(suffix) <= 20480 and not suffix.strip(b'\0'), 'Invalid tar closure')
                emit(suffix)
        require(seen == set(expected) and tar_size == recipe['tar']['size'] and tar_digest.hexdigest() == recipe['tar']['sha256'], 'Original tar stream differs')
        checked_file(output, target)
        # Decode the reconstructed archive independently before publishing.
        extract_checked(output, target, work / 'final-verification')
        result = {'schemaVersion': 1, 'status': 'reassembled-exact', 'recipeSha256': recipe_sha256, 'expandedRecipeSha256': digest(recipe_bytes),
                  'fileName': target['fileName'], 'size': target['size'], 'sha256': target['sha256'],
                  'tarSha256': recipe['tar']['sha256'], 'filesVerified': len(expected), 'releaseId': RELEASE_ID,
                  'originalArchiveBytesPreserved': True, 'compression': recipe['compression']}
        if upload:
            require(not offline, 'Offline assembly cannot publish')
            current_release = release()
            matches = [asset for asset in current_release['assets'] if asset['name'] == target['fileName']]
            if matches:
                require(len(matches) == 1 and matches[0]['state'] == 'uploaded' and matches[0]['size'] == target['size'] and matches[0]['digest'] == 'sha256:' + target['sha256'], 'Conflicting immutable target asset')
            else:
                subprocess.run(['gh', 'release', 'upload', RELEASE_TAG, str(output), '--repo', REPOSITORY], check=True)
            matches = [asset for asset in release()['assets'] if asset['name'] == target['fileName']]
            require(len(matches) == 1 and matches[0]['state'] == 'uploaded' and matches[0]['size'] == target['size'] and matches[0]['digest'] == 'sha256:' + target['sha256'], 'Published target identity differs')
            result.update(status='published-exact-verified', assetId=matches[0]['id'], serverDigest=matches[0]['digest'])
        (destination / 'assembly-result.json').write_text(json.dumps(result, indent=2) + '\n')
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    prepare = commands.add_parser('prepare')
    prepare.add_argument('--id', required=True)
    prepare.add_argument('--manifest', default=str(ROOT / 'platforms/sdk-artifacts.lock.json'))
    prepare.add_argument('--archive-dir', default=str(ROOT / 'artifacts/private/sdk'))
    prepare.add_argument('--out', required=True)
    assembly = commands.add_parser('assemble')
    assembly.add_argument('--recipe', required=True)
    assembly.add_argument('--recipe-sha256', required=True)
    assembly.add_argument('--destination', required=True)
    assembly.add_argument('--offline')
    assembly.add_argument('--upload', action='store_true')
    args = parser.parse_args()
    if args.command == 'prepare':
        result = prepare_recipe(json.loads(Path(args.manifest).read_text()), args.id, args.archive_dir, args.out)
    else:
        result = assemble(args.recipe, args.recipe_sha256, args.destination, args.offline, args.upload)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
