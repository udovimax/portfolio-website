import test from 'node:test'
import assert from 'node:assert/strict'
import { isGitLfsPointer, normalizeMediaRelativePath } from './pagesMedia.ts'

test('recognises Git LFS pointer payloads before they reach Pages', () => {
  assert.equal(isGitLfsPointer('version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 123\n'), true)
  assert.equal(isGitLfsPointer('not a Git LFS pointer'), false)
  assert.equal(isGitLfsPointer(Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:abc\n')), true)
})

test('flattens repeated media folders from restored Pages artifacts', () => {
  assert.equal(normalizeMediaRelativePath('media/max-instagram/full-videos/clip-01.mp4'), 'max-instagram/full-videos/clip-01.mp4')
  assert.equal(normalizeMediaRelativePath('media/media/media/video/third-day.mp4'), 'video/third-day.mp4')
})
