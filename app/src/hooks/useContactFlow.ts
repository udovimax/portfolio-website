import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildAvailabilityUrl,
  isSelectableBookingRange,
  normaliseAvailabilityResponse,
  type BookingRange,
} from '../utils/availability'
import { BOOKING_INTEREST, COLLABORATION_INTEREST } from '../utils/contactInterests'
import { validateContactFlowStep, type ContactFlowValues } from '../utils/contactFlow'

export type AvailabilityState = 'idle' | 'loading' | 'ready' | 'error'

export interface ContactFlowOptions {
  isOpen: boolean
  endpointEmail: string
  subject: string
  googleSheetsEndpoint?: string
  initialInterest?: string
}

export interface ContactFlowController {
  formAction: string
  isSubmitting: boolean
  isSubmitted: boolean
  showThankYou: boolean
  isSupportExpanded: boolean
  submitError: string | null
  interest: string
  isBooking: boolean
  isCollaboration: boolean
  bookingDate: string
  bookingTime: string
  bookingEndTime: string
  bookingLocation: string
  bookingTypeChoice: string
  calendarMonth: Date
  calendarDays: Date[]
  minimumBookingDate: string
  availability: Record<string, BookingRange[]>
  availabilityState: AvailabilityState
  availableDates: Set<string>
  availableRanges: BookingRange[]
  selectableRanges: BookingRange[]
  availableLocations: string[]
  selectedLocationRanges: BookingRange[]
  availableEndTimes: string[]
  bookingTypeOptions: string[]
  selectedRange: BookingRange | undefined
  setInterest: (value: string) => void
  selectBookingDate: (value: string) => void
  setBookingTime: (value: string) => void
  setBookingEndTime: (value: string) => void
  setBookingLocation: (value: string) => void
  setBookingTypeChoice: (value: string) => void
  setCalendarMonth: (value: Date | ((current: Date) => Date)) => void
  submit: (values: ContactFlowValues) => Promise<boolean>
  resetSubmission: () => void
}

export function dateKey(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(1)
  next.setMonth(next.getMonth() + amount)
  return next
}

export function durationHours(range: Pick<BookingRange, 'start' | 'end'>) {
  const [startHours, startMinutes] = range.start.split(':').map(Number)
  const [endHours, endMinutes] = range.end.split(':').map(Number)
  return Math.max(0, ((endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)) / 60)
}

function minimumBookingDate() {
  const localToday = new Date()
  return new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

function setSubmissionError(setter: (value: string | null) => void, message: string) {
  setter(message)
  return false
}

export function useContactFlow({
  isOpen,
  endpointEmail,
  subject,
  googleSheetsEndpoint,
  initialInterest = '',
}: ContactFlowOptions): ContactFlowController {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [isSupportExpanded, setIsSupportExpanded] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [interest, setInterestState] = useState(initialInterest)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTimeState] = useState('')
  const [bookingEndTime, setBookingEndTimeState] = useState('')
  const [bookingLocation, setBookingLocationState] = useState('')
  const [bookingTypeChoice, setBookingTypeChoiceState] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [availability, setAvailability] = useState<Record<string, BookingRange[]>>({})
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>('idle')

  const formAction = `https://formsubmit.co/${endpointEmail}`
  const isBooking = interest === BOOKING_INTEREST
  const isCollaboration = interest === COLLABORATION_INTEREST
  const today = minimumBookingDate()
  const availableRanges = bookingDate ? availability[bookingDate] || [] : []
  const selectableRanges = availableRanges.filter(isSelectableBookingRange)
  const availableLocations = [...new Set(selectableRanges.map((range) => range.publicLocation).filter(Boolean))]
  const selectedLocationRanges = bookingLocation
    ? selectableRanges.filter((range) => range.publicLocation === bookingLocation)
    : availableLocations.length > 1
      ? []
      : selectableRanges
  const availableEndTimes = [...new Set(
    selectedLocationRanges.filter((range) => range.start === bookingTime).map((range) => range.end),
  )]
  const bookingTypeOptions = [...new Set(selectedLocationRanges
    .filter((range) => range.start === bookingTime && range.end === bookingEndTime)
    .map((range) => range.bookingType))]
  const selectedRange = selectedLocationRanges.find((range) => range.start === bookingTime
    && range.end === bookingEndTime
    && (bookingTypeOptions.length < 2 || range.bookingType === bookingTypeChoice))
  const availableDates = useMemo(() => new Set(Object.keys(availability)), [availability])
  const calendarDays = useMemo(() => {
    const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const calendarOffset = (calendarStart.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(calendarStart)
      day.setDate(1 + index - calendarOffset)
      return day
    })
  }, [calendarMonth])

  useEffect(() => {
    if (!isOpen || !isBooking || !googleSheetsEndpoint) {
      setAvailability({})
      setAvailabilityState('idle')
      return
    }

    const callbackName = `maxAvailability_${Date.now()}`
    const script = document.createElement('script')
    script.src = buildAvailabilityUrl(googleSheetsEndpoint, today, 120, callbackName)
    script.async = true
    setAvailabilityState('loading')

    const windowWithCallback = window as typeof window & Record<string, unknown>
    windowWithCallback[callbackName] = (response: unknown) => {
      const responseRecord = response && typeof response === 'object'
        ? response as Record<string, unknown>
        : null
      setAvailability(normaliseAvailabilityResponse(response))
      setAvailabilityState(responseRecord?.ok === true ? 'ready' : 'error')
      delete windowWithCallback[callbackName]
      script.remove()
    }
    script.onerror = () => {
      setAvailabilityState('error')
      delete windowWithCallback[callbackName]
      script.remove()
    }
    document.body.appendChild(script)

    return () => {
      delete windowWithCallback[callbackName]
      script.remove()
    }
  }, [googleSheetsEndpoint, isBooking, isOpen, today])

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
      setIsSubmitted(false)
      setShowThankYou(false)
      setIsSupportExpanded(false)
      setSubmitError(null)
      setInterestState('')
      setBookingDate('')
      setBookingTimeState('')
      setBookingEndTimeState('')
      setBookingLocationState('')
      setBookingTypeChoiceState('')
      setAvailability({})
      setAvailabilityState('idle')
      return
    }

    setIsSubmitting(false)
    setIsSubmitted(false)
    setShowThankYou(false)
    setIsSupportExpanded(false)
    setSubmitError(null)
    setInterestState(initialInterest)
    setBookingDate('')
    setBookingTimeState('')
    setBookingEndTimeState('')
    setBookingLocationState('')
    setBookingTypeChoiceState('')
  }, [initialInterest, isOpen])

  useEffect(() => {
    if (!showThankYou) return

    const fadeTimer = window.setTimeout(() => {
      setShowThankYou(false)
      setIsSupportExpanded(true)
    }, 3600)
    return () => window.clearTimeout(fadeTimer)
  }, [showThankYou])

  const setInterest = useCallback((value: string) => {
    setInterestState(value)
    setBookingDate('')
    setBookingTimeState('')
    setBookingEndTimeState('')
    setBookingLocationState('')
    setBookingTypeChoiceState('')
    setSubmitError(null)
  }, [])

  const selectBookingDate = useCallback((value: string) => {
    setBookingDate(value)
    setBookingTimeState('')
    setBookingEndTimeState('')
    setBookingTypeChoiceState('')
    const nextRanges = (availability[value] || []).filter(isSelectableBookingRange)
    const nextLocations = [...new Set(nextRanges.map((range) => range.publicLocation).filter(Boolean))]
    setBookingLocationState(nextLocations.length === 1 ? nextLocations[0] : '')
  }, [availability])

  const setBookingTime = useCallback((value: string) => {
    setBookingTimeState(value)
    setBookingEndTimeState('')
    setBookingTypeChoiceState('')
  }, [])

  const setBookingEndTime = useCallback((value: string) => {
    setBookingEndTimeState(value)
    setBookingTypeChoiceState('')
  }, [])

  const setBookingLocation = useCallback((value: string) => {
    setBookingLocationState(value)
    setBookingTimeState('')
    setBookingEndTimeState('')
    setBookingTypeChoiceState('')
  }, [])

  const setBookingTypeChoice = useCallback((value: string) => {
    setBookingTypeChoiceState(value)
  }, [])

  const submit = useCallback(async (values: ContactFlowValues) => {
    if (isSubmitting || isSubmitted) return false

    const nextValues: ContactFlowValues = {
      ...values,
      interest: values.interest ?? interest,
      bookingDate: values.bookingDate ?? bookingDate,
      bookingTime: values.bookingTime ?? bookingTime,
      bookingEndTime: values.bookingEndTime ?? bookingEndTime,
      bookingToken: values.bookingToken ?? selectedRange?.bookingToken ?? '',
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const detailError = validateContactFlowStep('details', nextValues)
    if (detailError) {
      setIsSubmitting(false)
      return setSubmissionError(setSubmitError, detailError)
    }

    const identityError = validateContactFlowStep('identity', nextValues)
    if (identityError) {
      setIsSubmitting(false)
      return setSubmissionError(setSubmitError, identityError)
    }

    const projectUrl = nextValues.projectUrl?.trim() || ''
    if (isCollaboration && !projectUrl) {
      setIsSubmitting(false)
      return setSubmissionError(setSubmitError, 'Add a link to the project you want to discuss.')
    }
    if (projectUrl) {
      try {
        const parsedUrl = new URL(projectUrl)
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported URL protocol')
      } catch {
        setIsSubmitting(false)
        return setSubmissionError(setSubmitError, 'Please enter a valid project link beginning with https://.')
      }
    }

    if (isBooking && (!selectedRange || !isSelectableBookingRange(selectedRange))) {
      setIsSubmitting(false)
      return setSubmissionError(setSubmitError, 'That booking time is no longer available. Please choose another slot.')
    }
    if (isBooking && availableLocations.length > 1 && !bookingLocation) {
      setIsSubmitting(false)
      return setSubmissionError(setSubmitError, 'Choose a studio or location before sending.')
    }

    const formData = new FormData()
    formData.set('_subject', subject)
    formData.set('_captcha', 'false')
    formData.set('_template', 'table')
    formData.set('_type', 'lead')
    formData.set('_honey', '')
    for (const [key, value] of Object.entries(nextValues)) {
      if (typeof value === 'string') formData.set(key, value.trim())
    }
    formData.set('bookingPublicLocation', bookingLocation)

    try {
      const emailSubmission = fetch(formAction, {
        method: 'POST',
        body: formData,
        mode: 'no-cors',
      })
      if (googleSheetsEndpoint) {
        void fetch(googleSheetsEndpoint, {
          method: 'POST',
          body: formData,
          mode: 'no-cors',
        }).catch(() => undefined)
      }
      await emailSubmission
    } catch {
      setIsSubmitting(false)
      return setSubmissionError(setSubmitError, 'The message could not be sent. Please try again or email Max directly.')
    }

    setIsSubmitting(false)
    setIsSubmitted(true)
    setShowThankYou(true)
    setIsSupportExpanded(false)
    setBookingDate('')
    setBookingTimeState('')
    setBookingEndTimeState('')
    setBookingLocationState('')
    setBookingTypeChoiceState('')
    return true
  }, [availableLocations.length, bookingDate, bookingEndTime, bookingLocation, bookingTime, formAction, googleSheetsEndpoint, interest, isBooking, isCollaboration, isSubmitted, isSubmitting, selectedRange, subject])

  const resetSubmission = useCallback(() => {
    setIsSubmitting(false)
    setIsSubmitted(false)
    setShowThankYou(false)
    setIsSupportExpanded(false)
    setSubmitError(null)
  }, [])

  return {
    formAction,
    isSubmitting,
    isSubmitted,
    showThankYou,
    isSupportExpanded,
    submitError,
    interest,
    isBooking,
    isCollaboration,
    bookingDate,
    bookingTime,
    bookingEndTime,
    bookingLocation,
    bookingTypeChoice,
    calendarMonth,
    calendarDays,
    minimumBookingDate: today,
    availability,
    availabilityState,
    availableDates,
    availableRanges,
    selectableRanges,
    availableLocations,
    selectedLocationRanges,
    availableEndTimes,
    bookingTypeOptions,
    selectedRange,
    setInterest,
    selectBookingDate,
    setBookingTime,
    setBookingEndTime,
    setBookingLocation,
    setBookingTypeChoice,
    setCalendarMonth,
    submit,
    resetSubmission,
  }
}
