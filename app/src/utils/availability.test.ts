import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAvailabilityUrl,
  formatBookingEstimate,
  isSelectableBookingRange,
  normaliseAvailabilityResponse,
} from './availability.ts'

test('normalises safe public ranges and keeps estimates only on available windows', () => {
  const result = normaliseAvailabilityResponse({
    ok: true,
    slots: [
      {
        date: '2026-10-04',
        ranges: [
          {
            start: '14:00', end: '16:00', status: 'available', publicLocation: 'Kingston',
            bookingType: 'Studio session', bookingToken: 'opaque-key',
            estimatedHourlyPrice: '20', estimatedTravelFee: '5', estimatedTotal: '45',
            location: 'Kingston studio', price: '20', paymentUrl: 'https://private.test/pay',
          },
          {
            start: '16:00', end: '18:00', status: 'booked', publicLocation: 'Kingston',
            bookingType: 'Studio session', bookingToken: 'should-not-leak',
            estimatedHourlyPrice: '20', estimatedTravelFee: '5', estimatedTotal: '45',
          },
          { start: '18:00', end: '18:30', status: 'travel', publicLocation: 'Transit', bookingType: 'Travel / transit' },
        ],
      },
    ],
  })

  assert.deepEqual(result, {
    '2026-10-04': [
      {
        start: '14:00', end: '16:00', status: 'available', publicLocation: 'Kingston',
        bookingType: 'Studio session', bookingToken: 'opaque-key',
        estimatedHourlyPrice: '20', estimatedTravelFee: '5', estimatedTotal: '45',
      },
      { start: '16:00', end: '18:00', status: 'booked', publicLocation: 'Kingston', bookingType: 'Studio session' },
      { start: '18:00', end: '18:30', status: 'travel', publicLocation: 'Transit', bookingType: 'Travel / transit' },
    ],
  })
})

test('drops malformed slots and ranges instead of creating selectable dates', () => {
  const result = normaliseAvailabilityResponse({
    ok: true,
    slots: [
      { date: 'not-a-date', ranges: [{ start: '14:00', end: '16:00' }] },
      { date: '2026-10-05', ranges: [{ start: '14:00', end: 'bad' }, { start: '15:00', end: '17:00', status: 'available' }] },
    ],
  })

  assert.deepEqual(result, {
    '2026-10-05': [
      { start: '15:00', end: '17:00', status: 'available', publicLocation: 'Location to be confirmed', bookingType: 'Booking details to be confirmed' },
    ],
  })
})

test('only available windows with an opaque booking token are selectable', () => {
  const ranges = normaliseAvailabilityResponse({
    slots: [{ date: '2026-10-06', ranges: [
      { start: '10:00', end: '11:00', status: 'available', bookingToken: 'ready' },
      { start: '11:00', end: '12:00', status: 'available' },
      { start: '12:00', end: '13:00', status: 'requested', bookingToken: 'busy' },
      { start: '13:00', end: '14:00', status: 'travel' },
    ] }],
  })['2026-10-06']

  assert.equal(isSelectableBookingRange(ranges[0]), true)
  assert.equal(isSelectableBookingRange(ranges[1]), false)
  assert.equal(isSelectableBookingRange(ranges[2]), false)
  assert.equal(isSelectableBookingRange(ranges[3]), false)
})

test('formats estimates only for available ranges', () => {
  assert.equal(formatBookingEstimate({
    status: 'available', estimatedHourlyPrice: '40', estimatedTravelFee: '18', estimatedTotal: '98',
  }, 2), 'Estimated £40/hour + £18 travel · £98 total')
  assert.equal(formatBookingEstimate({ status: 'booked' }, 4), '')
  assert.equal(formatBookingEstimate({ status: 'available' }, 2), 'Price to be confirmed by Max')
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
