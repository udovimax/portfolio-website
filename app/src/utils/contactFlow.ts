import type { MobileEnquiryStep } from './mobileFunnel'

export interface ContactFlowValues {
  interest?: string
  message?: string
  name?: string
  email?: string
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
    return hasValue(values.message) ? null : 'Add a message so Max knows what you would like to discuss.'
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
