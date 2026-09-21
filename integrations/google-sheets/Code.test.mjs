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
