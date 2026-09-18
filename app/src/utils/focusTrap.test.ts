import test from 'node:test'
import assert from 'node:assert/strict'
import { getFocusLoopTarget } from './focusTrap.ts'

const first = { id: 'first' } as HTMLElement
const middle = { id: 'middle' } as HTMLElement
const last = { id: 'last' } as HTMLElement
const focusable = [first, middle, last]

test('wraps forward focus from the last element to the first', () => {
  assert.equal(getFocusLoopTarget(last, focusable, false), first)
})

test('wraps reverse focus from the first element to the last', () => {
  assert.equal(getFocusLoopTarget(first, focusable, true), last)
})

test('moves focus inward when the active element is inside the trap', () => {
  assert.equal(getFocusLoopTarget(first, focusable, false), middle)
  assert.equal(getFocusLoopTarget(last, focusable, true), middle)
})

test('starts at the correct edge when focus is outside the trap', () => {
  const outside = { id: 'outside' } as HTMLElement
  assert.equal(getFocusLoopTarget(outside, focusable, false), first)
  assert.equal(getFocusLoopTarget(outside, focusable, true), last)
})

test('returns null when there are no focusable elements', () => {
  assert.equal(getFocusLoopTarget(null, [], false), null)
})
