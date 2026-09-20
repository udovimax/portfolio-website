import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveAssetUrl } from './useSiteContent.ts'

test('resolves relative assets against the current site base rather than the CSS bundle directory', () => {
  assert.equal(
    resolveAssetUrl('media/images/film/frame.jpg', './', 'https://maxudovichenko.art/'),
    'https://maxudovichenko.art/media/images/film/frame.jpg',
  )
  assert.equal(
    resolveAssetUrl('/media/images/film/frame.jpg', './', 'https://udovimax.github.io/portfolio-website/'),
    'https://udovimax.github.io/portfolio-website/media/images/film/frame.jpg',
  )
})

test('preserves externally hosted and special asset URLs', () => {
  assert.equal(resolveAssetUrl('https://example.test/image.jpg', './', 'https://maxudovichenko.art/'), 'https://example.test/image.jpg')
  assert.equal(resolveAssetUrl('data:image/svg+xml;base64,abc', './', 'https://maxudovichenko.art/'), 'data:image/svg+xml;base64,abc')
})
