import test from 'node:test'
import assert from 'node:assert/strict'
import { routeFromHash } from './navigation.ts'

test('maps the legacy contact hash to the about page and opens contact', () => {
  assert.deepEqual(routeFromHash('#contact'), { page: 'about', opensContact: true })
})

test('keeps supported page hashes routable without opening contact', () => {
  assert.deepEqual(routeFromHash('#projects'), { page: 'projects', opensContact: false })
  assert.deepEqual(routeFromHash('#/video'), { page: 'video', opensContact: false })
})

test('falls back to home for unknown hashes', () => {
  assert.deepEqual(routeFromHash('#unknown'), { page: 'home', opensContact: false })
})
