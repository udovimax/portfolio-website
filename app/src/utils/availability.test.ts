import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAvailabilityUrl, normaliseAvailabilityResponse } from './availability.ts'

test('normalises valid booking ranges and preserves optional commercial fields', () => {
  const result = normaliseAvailabilityResponse({
    ok: true,
    slots: [
      {
        date: '2026-10-04',
        ranges: [
          { start: '14:00', end: '16:00', location: 'Kingston studio', price: '20', paymentUrl: 'https://paypal.me/example' },
        ],
      },
    ],
  })

  assert.deepEqual(result, {
    '2026-10-04': [
      { start: '14:00', end: '16:00', location: 'Kingston studio', price: '20', paymentUrl: 'https://paypal.me/example' },
    ],
  })
})

test('drops malformed slots and ranges instead of creating selectable dates', () => {
  const result = normaliseAvailabilityResponse({
    ok: true,
    slots: [
      { date: 'not-a-date', ranges: [{ start: '14:00', end: '16:00' }] },
      { date: '2026-10-05', ranges: [{ start: '14:00', end: 'bad' }, { start: '15:00', end: '17:00' }] },
    ],
  })

  assert.deepEqual(result, {
    '2026-10-05': [
      { start: '15:00', end: '17:00', location: '', price: '', paymentUrl: '' },
    ],
  })
})

test('builds the JSONP availability request without changing the configured endpoint', () => {
  const result = buildAvailabilityUrl('https://script.example.test/exec', '2026-09-18', 120, 'maxAvailability_1')
  const url = new URL(result)

  assert.equal(url.origin, 'https://script.example.test')
  assert.equal(url.pathname, '/exec')
  assert.equal(url.searchParams.get('action'), 'availability')
  assert.equal(url.searchParams.get('from'), '2026-09-18')
  assert.equal(url.searchParams.get('days'), '120')
  assert.equal(url.searchParams.get('callback'), 'maxAvailability_1')
})
