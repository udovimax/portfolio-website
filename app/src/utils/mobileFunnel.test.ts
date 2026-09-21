import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MOBILE_FUNNEL_SCREEN_LABELS,
  MOBILE_ROUTE_OPTIONS,
  clampStepIndex,
  contactSurfaceForPhone,
  mobileRouteAction,
} from './mobileFunnel.ts'

test('maps mobile route choices to existing site actions', () => {
  assert.deepEqual(mobileRouteAction('work'), { kind: 'contact', value: '' })
  assert.deepEqual(mobileRouteAction('hear'), { kind: 'hash', value: '#music' })
  assert.deepEqual(mobileRouteAction('explore'), { kind: 'hash', value: '#about' })
})

test('clamps funnel step indexes to real bounds', () => {
  assert.equal(clampStepIndex(-1, 2), 0)
  assert.equal(clampStepIndex(1, 2), 1)
  assert.equal(clampStepIndex(8, 2), 1)
  assert.equal(clampStepIndex(0, 0), 0)
})

test('describes the two mobile screens and three route actions', () => {
  assert.deepEqual(MOBILE_FUNNEL_SCREEN_LABELS, ['Meet Max', 'Find your way in'])
  assert.deepEqual(MOBILE_ROUTE_OPTIONS.map((option) => option.action), ['work', 'hear', 'explore'])
  assert.equal(MOBILE_ROUTE_OPTIONS.map((option) => option.label).join('|'), 'Work with Max|Hear Max|Explore the practice')
  assert.ok(MOBILE_ROUTE_OPTIONS.every((option) => option.description))
})

test('selects exactly one contact presentation for the current viewport', () => {
  assert.equal(contactSurfaceForPhone(true), 'mobile')
  assert.equal(contactSurfaceForPhone(false), 'desktop')
})
