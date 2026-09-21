export type BookingStatus = 'available' | 'requested' | 'booked' | 'travel'

export interface BookingRange {
  start: string
  end: string
  status: BookingStatus
  publicLocation: string
  bookingType: string
  bookingToken?: string
  estimatedHourlyPrice?: string
  estimatedTravelFee?: string
  estimatedTotal?: string
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/
const STATUS_VALUES = new Set<BookingStatus>(['available', 'requested', 'booked', 'travel'])

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
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normaliseStatus(value: unknown): BookingStatus | null {
  const status = optionalString(value).toLowerCase()
  if (!status) return 'available'
  return STATUS_VALUES.has(status as BookingStatus) ? status as BookingStatus : null
}

function normaliseRange(value: unknown, fallback: Record<string, unknown> = {}): BookingRange | null {
  if (!value || typeof value !== 'object') return null

  const range = value as Record<string, unknown>
  const start = normaliseTime(range.start)
  const end = normaliseTime(range.end)
  const status = normaliseStatus(range.status ?? fallback.status)
  if (!start || !end || start >= end || !status) return null

  const result: BookingRange = {
    start,
    end,
    status,
    publicLocation: optionalString(range.publicLocation ?? fallback.publicLocation) || 'Location to be confirmed',
    bookingType: optionalString(range.bookingType ?? fallback.bookingType) || 'Booking details to be confirmed',
  }

  if (status !== 'available') return result

  const bookingToken = optionalString(range.bookingToken ?? fallback.bookingToken)
  if (bookingToken) result.bookingToken = bookingToken

  const estimatedHourlyPrice = optionalString(range.estimatedHourlyPrice ?? fallback.estimatedHourlyPrice)
  const estimatedTravelFee = optionalString(range.estimatedTravelFee ?? fallback.estimatedTravelFee)
  const estimatedTotal = optionalString(range.estimatedTotal ?? fallback.estimatedTotal)
  if (estimatedHourlyPrice) result.estimatedHourlyPrice = estimatedHourlyPrice
  if (estimatedTravelFee) result.estimatedTravelFee = estimatedTravelFee
  if (estimatedTotal) result.estimatedTotal = estimatedTotal
  return result
}

function rangesForSlot(slot: Record<string, unknown>): BookingRange[] {
  const rangeValues = Array.isArray(slot.ranges)
    ? slot.ranges
    : Array.isArray(slot.times)
      ? slot.times.map((time) => ({ start: time, end: addHour(time) }))
      : []

  return rangeValues
    .map((range) => normaliseRange(range, slot))
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
    if (ranges.length > 0) availability[date] = [...(availability[date] || []), ...ranges]
    return availability
  }, {})
}

export function isSelectableBookingRange(range: BookingRange): boolean {
  return range.status === 'available' && Boolean(range.bookingToken)
}

export function formatBookingEstimate(
  range: Pick<BookingRange, 'status' | 'estimatedHourlyPrice' | 'estimatedTravelFee' | 'estimatedTotal'>,
  durationHours: number,
): string {
  if (range.status !== 'available') return ''

  const hourly = optionalString(range.estimatedHourlyPrice)
  if (!hourly) return 'Price to be confirmed by Max'

  const travel = optionalString(range.estimatedTravelFee)
  let total = optionalString(range.estimatedTotal)
  const duration = Math.max(0, Number(durationHours) || 0)
  if (!total && duration > 0 && Number.isFinite(Number(hourly))) {
    const travelAmount = Number(travel) || 0
    total = String(Number(hourly) * duration + travelAmount)
  }
  const travelPart = travel && Number(travel) > 0 ? ` + £${travel} travel` : ''
  const totalPart = total ? ` · £${total} total` : ''
  return `Estimated £${hourly}/hour${travelPart}${totalPart}`
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
