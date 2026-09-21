import type { MobileEnquiryStep } from './mobileFunnel'

const BOOKING_INTEREST = 'Booking / studio session'

export interface ContactFlowValues {
  interest?: string
  message?: string
  name?: string
  email?: string
  projectUrl?: string
  bookingDate?: string
  bookingTime?: string
  bookingEndTime?: string
  bookingToken?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

function hasValue(value: string | undefined) {
  return Boolean(value?.trim())
}

export function validateContactFlowStep(step: MobileEnquiryStep, values: ContactFlowValues): string | null {
  if (step === 'intent') {
    return hasValue(values.interest) ? null : 'Choose what you need help with before continuing.'
  }

  if (step === 'details') {
    if (!hasValue(values.message)) {
      return 'Add a message so Max knows what you would like to discuss.'
    }

    if (values.interest === BOOKING_INTEREST
      && (!hasValue(values.bookingDate)
        || !hasValue(values.bookingTime)
        || !hasValue(values.bookingEndTime)
        || !hasValue(values.bookingToken))) {
      return 'Choose an available booking date and time before continuing.'
    }

    return null
  }

  if (step === 'identity') {
    if (!hasValue(values.name)) {
      return 'Add your name before continuing.'
    }

    if (!values.email || !EMAIL_PATTERN.test(values.email.trim())) {
      return 'Enter a valid email address so Max can reply.'
    }

    return null
  }

  if (step === 'review') {
    return validateContactFlowStep('intent', values)
      ?? validateContactFlowStep('details', values)
      ?? validateContactFlowStep('identity', values)
  }

  return null
}
