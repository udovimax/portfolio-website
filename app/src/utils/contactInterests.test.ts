import test from 'node:test'
import assert from 'node:assert/strict'
import { CONTACT_INTEREST_OPTIONS, FILM_GAMES_INTEREST, GENERAL_INTEREST } from './contactInterests.ts'

test('includes a film and games work enquiry option', () => {
  assert.ok(CONTACT_INTEREST_OPTIONS.some((option) => option.value === FILM_GAMES_INTEREST))
  assert.equal(FILM_GAMES_INTEREST, 'Film / games work')
})

test('uses an explicit value for general enquiries', () => {
  assert.deepEqual(
    CONTACT_INTEREST_OPTIONS.find((option) => option.label === 'General enquiry'),
    { value: GENERAL_INTEREST, label: 'General enquiry' },
  )
})
