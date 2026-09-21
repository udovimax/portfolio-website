import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8')
const context = {
  Utilities: { formatDate: () => '2026-09-21', getUuid: () => 'test-key' },
  Session: { getScriptTimeZone: () => 'Europe/London' },
  SpreadsheetApp: {}, ContentService: {}, LockService: {}, GmailApp: {},
  console,
}
vm.runInNewContext(source, context)

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

test('same exact location has no travel requirement', () => {
  assert.deepEqual(plain(context.travelRequirement_('Camden studio', 'Camden studio', [])), {
    configured: true, minutes: 0, fee: 0,
  })
})

test('different locations use the configured rule', () => {
  assert.deepEqual(plain(context.travelRequirement_('Camden studio', 'Kingston studio', [
    { fromLocation: 'Camden studio', toLocation: 'Kingston studio', minutes: 55, fee: '18' },
  ])), { configured: true, minutes: 55, fee: '18' })
})

test('public booked projection omits private and estimate fields', () => {
  const result = plain(context.toPublicAvailabilityRange_({
    startTime: '11:00', endTime: '15:00', status: 'Booked',
    location: 'Camden studio', publicLocation: 'Camden', bookingType: 'Studio session',
    bookingKey: 'secret-row-key', price: '1000', paymentUrl: 'https://private.test/pay',
  }))
  assert.deepEqual(result, {
    start: '11:00', end: '15:00', status: 'booked',
    publicLocation: 'Camden', bookingType: 'Studio session',
  })
})

test('available estimate includes travel fee and duration total', () => {
  assert.deepEqual(plain(context.estimateAvailability_(
    { startTime: '16:00', endTime: '18:00', location: 'Kingston studio', price: '40' },
    { endTime: '15:00', location: 'Camden studio' },
    null,
    [{ fromLocation: 'Camden studio', toLocation: 'Kingston studio', minutes: 45, fee: '18' }],
  )), {
    eligible: true, travelMinutes: 45, travelFee: '18', hourlyPrice: '40', total: '98',
  })
})

test('available public projection exposes only its own provisional estimate', () => {
  const result = plain(context.toPublicAvailabilityRange_({
    startTime: '16:00', endTime: '18:00', status: 'Available',
    location: 'Kingston studio', publicLocation: 'Kingston', bookingType: 'Studio session',
    bookingKey: 'opaque-key', price: '40', paymentUrl: 'https://private.test/pay',
  }, {
    eligible: true, hasEstimate: true, travelMinutes: 45, travelFee: '18', hourlyPrice: '40', total: '98',
  }))
  assert.deepEqual(result, {
    start: '16:00', end: '18:00', status: 'available',
    publicLocation: 'Kingston', bookingType: 'Studio session', bookingToken: 'opaque-key',
    estimatedHourlyPrice: '40', estimatedTravelFee: '18', estimatedTotal: '98',
  })
})

test('blank-price available windows remain bookable without estimate fields', () => {
  const estimate = plain(context.estimateAvailability_({
    startTime: '16:00', endTime: '18:00', location: 'Kingston studio', price: '',
  }, null, null, []))
  assert.deepEqual(estimate, {
    eligible: true, hasEstimate: false, travelMinutes: 0, travelFee: '',
  })

  const result = plain(context.toPublicAvailabilityRange_({
    startTime: '16:00', endTime: '18:00', status: 'Available',
    location: 'Kingston studio', publicLocation: 'Kingston', bookingType: 'Studio session',
    bookingKey: 'opaque-key', price: '',
  }, estimate))
  assert.deepEqual(result, {
    start: '16:00', end: '18:00', status: 'available',
    publicLocation: 'Kingston', bookingType: 'Studio session', bookingToken: 'opaque-key',
  })
})

test('missing cross-location travel rule blocks the candidate without guessing', () => {
  assert.deepEqual(plain(context.estimateAvailability_(
    { startTime: '16:00', endTime: '18:00', location: 'Kingston studio', price: '40' },
    { endTime: '15:00', location: 'Camden studio' },
    null,
    [],
  )), {
    eligible: false, reason: 'travel_not_configured', travelMinutes: 0, travelFee: '',
  })
})

test('cross-location travel buffer makes an otherwise open gap unavailable', () => {
  assert.deepEqual(plain(context.estimateAvailability_(
    { startTime: '15:30', endTime: '17:00', location: 'Kingston studio', price: '40' },
    { endTime: '15:00', location: 'Camden studio' },
    null,
    [{ fromLocation: 'Camden studio', toLocation: 'Kingston studio', minutes: 45, fee: '18' }],
  )), {
    eligible: false, reason: 'travel_conflict', travelMinutes: 45, travelFee: '18',
  })
})

test('public transit range reveals only neutral workload metadata', () => {
  const result = plain(context.publicTravelRanges_([
    { date: '2026-09-21', startTime: '11:00', endTime: '15:00', status: 'Booked', location: 'Camden studio' },
    { date: '2026-09-21', startTime: '16:00', endTime: '18:00', status: 'Requested', location: 'Kingston studio' },
  ], [{ fromLocation: 'Camden studio', toLocation: 'Kingston studio', minutes: 45, fee: '18' }]))
  assert.deepEqual(result, [{
    startTime: '15:00', endTime: '15:45', status: 'Travel',
    publicLocation: 'Transit', bookingType: 'Travel / transit',
  }])
  assert.deepEqual(plain(context.toPublicAvailabilityRange_(result[0])), {
    start: '15:00', end: '15:45', status: 'travel',
    publicLocation: 'Transit', bookingType: 'Travel / transit',
  })
})
