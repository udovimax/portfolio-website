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

function fakeGmailMessage({ id, from, date, body, draft = false }) {
  return {
    getId: () => id,
    getFrom: () => from,
    getDate: () => new Date(date),
    getPlainBody: () => body,
    isDraft: () => draft,
  }
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

test('latest customer reply ignores Max messages and returns the newest external message', () => {
  const result = plain(context.latestCustomerReply_([
    fakeGmailMessage({
      id: 'max-1', from: 'Max Udovichenko <maxudovichenko.prod@gmail.com>',
      date: '2026-09-21T09:00:00.000Z', body: 'Thanks for getting in touch.',
    }),
    fakeGmailMessage({
      id: 'customer-1', from: 'Customer <customer@example.com>',
      date: '2026-09-21T10:00:00.000Z', body: 'Here is the project brief.',
    }),
    fakeGmailMessage({
      id: 'customer-2', from: 'customer@example.com',
      date: '2026-09-21T11:00:00.000Z', body: 'I can do Thursday instead.',
    }),
  ], 'maxudovichenko.prod@gmail.com'))

  assert.deepEqual(result, {
    messageId: 'customer-2',
    at: '2026-09-21T11:00:00.000Z',
    body: 'I can do Thursday instead.',
  })
})

test('lead projection exposes stored Gmail thread and customer reply fields', () => {
  const row = Array(27).fill('')
  row[23] = 'thread-123'
  row[24] = vm.runInContext("new Date('2026-09-21T11:00:00.000Z')", context)
  row[25] = 'I can do Thursday instead.'
  row[26] = 'customer-2'

  const result = plain(context.leadFromRow_(row, 7))

  assert.equal(result.gmailThreadId, 'thread-123')
  assert.equal(result.customerReplyAt, '2026-09-21')
  assert.equal(result.customerReply, 'I can do Thursday instead.')
  assert.equal(result.customerReplyId, 'customer-2')
})

test('Gmail reply helper replies to the latest customer message in the stored thread', () => {
  const calls = []
  const customerMessage = fakeGmailMessage({
    id: 'customer-2', from: 'customer@example.com',
    date: '2026-09-21T11:00:00.000Z', body: 'I can do Thursday instead.',
  })
  const thread = {
    getId: () => 'thread-123',
    getMessages: () => [customerMessage],
  }
  const sentMessage = { getThread: () => thread }
  const draft = { send: () => sentMessage }
  context.GmailApp = {
    getThreadById: (id) => {
      calls.push(['thread', id])
      return thread
    },
  }
  customerMessage.createDraftReply = (body, options) => {
    calls.push(['reply', body, options])
    return draft
  }

  const result = plain(context.sendGmailReply_({
    email: 'customer@example.com', gmailThreadId: 'thread-123',
  }, 'Re: Portfolio enquiry', 'Thanks — Thursday works.'))

  assert.equal(result.threadId, 'thread-123')
  assert.deepEqual(plain(calls), [
    ['thread', 'thread-123'],
    ['reply', 'Thanks — Thursday works.', { name: 'Max Udovichenko' }],
  ])
})

test('customer reply sync writes the newest external Gmail message to the lead row', () => {
  const row = Array(27).fill('')
  row[23] = 'thread-123'
  const headers = context.LEAD_HEADERS
  const writes = []
  const sheet = {
    getLastColumn: () => headers.length,
    getRange: (rowNumber, column, rowCount, columnCount) => ({
      getValues: () => rowNumber === 1 ? [headers] : [row],
      setValue: (value) => {
        writes.push([rowNumber, column, value])
        row[column - 1] = value
      },
    }),
  }
  const customerMessage = fakeGmailMessage({
    id: 'customer-3', from: 'customer@example.com',
    date: '2026-09-21T12:00:00.000Z', body: 'Can we move this to Friday?',
  })
  context.GmailApp = { getThreadById: () => ({ getMessages: () => [customerMessage] }) }

  const result = context.syncCustomerReply_(sheet, 2, {
    gmailThreadId: 'thread-123', customerReplyAt: '', customerReply: '', customerReplyId: '',
  })

  assert.equal(result.customerReply, 'Can we move this to Friday?')
  assert.equal(result.customerReplyId, 'customer-3')
  assert.equal(writes.length, 3)
})

test('customer confirmation captures the Gmail thread created for a new enquiry', () => {
  const sentMessage = { getThread: () => ({ getId: () => 'thread-new' }) }
  const calls = []
  context.GmailApp = {
    createDraft: (recipient, subject, body, options) => {
      calls.push({ recipient, subject, body, options })
      return { send: () => sentMessage }
    },
  }

  const result = plain(context.sendCustomerConfirmation_({
    email: 'customer@example.com', name: 'Customer', message: 'Hello',
  }))

  assert.deepEqual(result, { sent: true, threadId: 'thread-new' })
  assert.equal(calls[0].recipient, 'customer@example.com')
  assert.equal(calls[0].options.replyTo, 'maxudovichenko.prod@gmail.com')
})
