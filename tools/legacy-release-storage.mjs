import assert from 'node:assert/strict';
import inventory from '../platforms/legacy-release-storage.json' with { type: 'json' };

// An explicit storage move, never a fallback or a caller-selected repository.
export function releaseStorageRepository(repository, releaseTag) {
  const frozen = inventory.repositories.find(item => item.manifestRepositories.includes(repository) && item.releaseTags.includes(releaseTag));
  if (frozen) return frozen.storageRepository;
  assert.equal(repository, 'weapp-container/website', 'Unknown historical artifact source');
  return repository;
}

export function assertNewReleaseTag(releaseTag) {
  assert.ok(!inventory.repositories.some(item => item.releaseTags.includes(releaseTag)), 'Historical release tags are read-only; choose a new release version');
}
