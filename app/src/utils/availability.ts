export interface BookingRange {
  start: string
  end: string
  location: string
  price: string
  paymentUrl: string
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/

function normaliseTime(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const match = TIME_PATTERN.exec(value.trim())
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

function addHour(value: unknown): string | null {
  const time = normaliseTime(value)
  if (!time) return null

  const [hours, minutes] = time.split(':').map(Number)
  return `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normaliseRange(value: unknown): BookingRange | null {
  if (!value || typeof value !== 'object') return null

  const range = value as Record<string, unknown>
  const start = normaliseTime(range.start)
  const end = normaliseTime(range.end)
  if (!start || !end || start >= end) return null

  return {
    start,
    end,
    location: optionalString(range.location),
    price: optionalString(range.price),
    paymentUrl: optionalString(range.paymentUrl),
  }
}

function rangesForSlot(slot: Record<string, unknown>): BookingRange[] {
  const rangeValues = Array.isArray(slot.ranges)
    ? slot.ranges
    : Array.isArray(slot.times)
      ? slot.times.map((time) => ({
          start: time,
          end: addHour(time),
          location: slot.location,
          price: slot.price,
          paymentUrl: slot.paymentUrl,
        }))
      : []

  return rangeValues
    .map((range) => normaliseRange(range))
    .filter((range): range is BookingRange => range !== null)
}

export function normaliseAvailabilityResponse(response: unknown): Record<string, BookingRange[]> {
  if (!response || typeof response !== 'object') return {}

  const payload = response as Record<string, unknown>
  if (!Array.isArray(payload.slots)) return {}

  return payload.slots.reduce<Record<string, BookingRange[]>>((availability, slot) => {
    if (!slot || typeof slot !== 'object') return availability

    const record = slot as Record<string, unknown>
    const date = typeof record.date === 'string' ? record.date.trim() : ''
    if (!DATE_PATTERN.test(date)) return availability

    const ranges = rangesForSlot(record)
    if (ranges.length > 0) availability[date] = ranges
    return availability
  }, {})
}

export function buildAvailabilityUrl(
  endpoint: string,
  from: string,
  days: number,
  callback: string,
): string {
  const url = new URL(endpoint)
  url.searchParams.set('action', 'availability')
  url.searchParams.set('from', from)
  url.searchParams.set('days', String(days))
  url.searchParams.set('callback', callback)
  return url.toString()
}
