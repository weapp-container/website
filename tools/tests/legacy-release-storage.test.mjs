import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNewReleaseTag, releaseStorageRepository } from '../legacy-release-storage.mjs';

test('frozen locks resolve exactly to private storage and new releases stay on website', () => {
  for (const repository of ['weapp-container/website', 'weapp-container/showcase']) {
    assert.equal(releaseStorageRepository(repository, 'showcase-v0.1.0-preview.6.0-candidate17'), 'weapp-container/website-private-archive');
  }
  assert.equal(releaseStorageRepository('weapp-container/runtime-artifacts', 'runtime-v0.1.0-preview.5.3'), 'weapp-container/runtime-artifacts-private-archive');
  assert.equal(releaseStorageRepository('weapp-container/website', 'showcase-v0.1.0-preview.6.0-candidate18'), 'weapp-container/website');
  assert.throws(() => releaseStorageRepository('weapp-container/showcase', 'showcase-v0.1.0-preview.6.0-candidate18'));
  assert.throws(() => releaseStorageRepository('other/repository', 'showcase-v0.1.0-preview.6.0-candidate17'));
  assert.throws(() => assertNewReleaseTag('showcase-v0.1.0-preview.6.0-candidate17'));
  assertNewReleaseTag('showcase-v0.1.0-preview.6.0-candidate18');
});
