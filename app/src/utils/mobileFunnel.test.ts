import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampStepIndex,
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
