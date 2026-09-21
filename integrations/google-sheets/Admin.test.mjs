import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const html = fs.readFileSync(new URL('./Admin.html', import.meta.url), 'utf8')

test('dashboard exposes range editing and travel controls', () => {
  assert.match(html, /event\.shiftKey/)
  assert.match(html, /contextmenu/)
  assert.match(html, /updateAvailabilitySelection/)
  assert.match(html, /saveTravelRule/)
  assert.doesNotMatch(html, /window\.prompt\(/)
})

test('dashboard has an accessible non-pointer bulk-edit path', () => {
  assert.match(html, /id="bulk-edit-open"[^>]*disabled/)
  assert.match(html, /id="bulk-edit-clear"[^>]*disabled/)
  assert.match(html, /id="context-edit-selected"/)
  assert.match(html, /function getSelectedAvailabilityRows\(/)
  assert.match(html, /availabilityAnchorDate/)
})

test('dashboard renders the latest customer reply from the linked Gmail thread', () => {
  assert.match(html, /Latest customer reply/)
  assert.match(html, /lead\.customerReply/)
  assert.match(html, /lead\.customerReplyAt/)
})
