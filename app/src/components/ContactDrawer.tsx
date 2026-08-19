import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

const BOOKING_INTEREST = 'Booking / studio session'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

type AvailabilityResponse = {
  ok: boolean
  slots?: Array<{ date: string; times: string[] }>
}

interface ContactDrawerProps {
  isOpen: boolean
  endpointEmail: string
  subject: string
  paypal: string
  paypalQr?: string
  googleSheetsEndpoint?: string
  initialInterest?: string
  onClose: () => void
}

export function ContactDrawer({
  isOpen,
  endpointEmail,
  subject,
  paypal,
  paypalQr,
  googleSheetsEndpoint,
  initialInterest = '',
  onClose,
}: ContactDrawerProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [isSupportExpanded, setIsSupportExpanded] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [interest, setInterest] = useState(initialInterest)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [availability, setAvailability] = useState<Record<string, string[]>>({})
  const [availabilityState, setAvailabilityState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  const formAction = `https://formsubmit.co/${endpointEmail}`
  const isBooking = interest === BOOKING_INTEREST
  const availableTimes = bookingDate ? availability[bookingDate] || [] : []
  const localToday = new Date()
  const minimumBookingDate = new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)

  useEffect(() => {
    if (!isOpen || !isBooking || !googleSheetsEndpoint) {
      setAvailability({})
      setAvailabilityState('idle')
      return
    }

    const callbackName = `maxAvailability_${Date.now()}`
    const script = document.createElement('script')
    const endpoint = new URL(googleSheetsEndpoint)
    endpoint.searchParams.set('action', 'availability')
    endpoint.searchParams.set('from', minimumBookingDate)
    endpoint.searchParams.set('days', '120')
    endpoint.searchParams.set('callback', callbackName)
    script.src = endpoint.toString()
    script.async = true
    setAvailabilityState('loading')

    const windowWithCallback = window as typeof window & Record<string, unknown>
    windowWithCallback[callbackName] = (response: AvailabilityResponse) => {
      const nextAvailability = (response.slots || []).reduce<Record<string, string[]>>((result, slot) => {
        result[slot.date] = slot.times
        return result
      }, {})
      setAvailability(nextAvailability)
      setAvailabilityState(response.ok ? 'ready' : 'error')
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
  }, [googleSheetsEndpoint, isBooking, isOpen, minimumBookingDate])

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
      setIsSubmitted(false)
      setShowThankYou(false)
      setIsSupportExpanded(false)
      setSubmitError(null)
      setInterest('')
      setBookingDate('')
      setBookingTime('')
      setAvailability({})
      setAvailabilityState('idle')
      return
    }

    setInterest(initialInterest)
    setBookingDate('')
    setBookingTime('')

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    const focusFrame = isTouchDevice
      ? null
      : window.requestAnimationFrame(() => firstFieldRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      if (focusFrame !== null) {
        window.cancelAnimationFrame(focusFrame)
      }
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [initialInterest, isOpen, onClose])

  useEffect(() => {
    if (!showThankYou) {
      return
    }

    const fadeTimer = window.setTimeout(() => {
      setShowThankYou(false)
      setIsSupportExpanded(true)
    }, 3600)
    return () => window.clearTimeout(fadeTimer)
  }, [showThankYou])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting || isSubmitted) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    const form = event.currentTarget

    try {
      // FormSubmit accepts a regular FormData POST. no-cors keeps the drawer
      // in place while the external service receives the message.
      const formData = new FormData(form)
      const email = String(formData.get('email') || '').trim()
      if (!EMAIL_PATTERN.test(email)) {
        setIsSubmitting(false)
        setSubmitError('Please enter a valid email address so Max can reply.')
        return
      }
      if (isBooking && (!bookingDate || !bookingTime)) {
        setIsSubmitting(false)
        setSubmitError('Choose an available booking date and time before sending.')
        return
      }
      if (isBooking && !availableTimes.includes(bookingTime)) {
        setIsSubmitting(false)
        setSubmitError('That booking time is no longer available. Please choose another slot.')
        return
      }
      const emailSubmission = fetch(formAction, {
        method: 'POST',
        body: formData,
        mode: 'no-cors',
      })
      if (googleSheetsEndpoint) {
        const sheetData = new FormData(form)
        void fetch(googleSheetsEndpoint, {
            method: 'POST',
            body: sheetData,
            mode: 'no-cors',
          }).catch(() => undefined)
      }

      // Email delivery remains authoritative. A missing Sheet must never make
      // a real enquiry look unsuccessful to the visitor.
      await emailSubmission
    } catch {
      setIsSubmitting(false)
      setSubmitError('The message could not be sent. Please try again or email Max directly.')
      return
    }

    {
      form.reset()
      setIsSubmitting(false)
      setIsSubmitted(true)
      setShowThankYou(true)
      setIsSupportExpanded(false)
      setBookingDate('')
      setBookingTime('')
    }
  }

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="contact-drawer-layer">
          <motion.button
            type="button"
            aria-label="Close contact panel"
            className="contact-drawer-backdrop fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            id="contact-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-drawer-title"
            data-lenis-prevent
            className="contact-drawer fixed right-0 top-0 h-dvh w-[min(100vw,30rem)] overflow-y-auto border-l border-white/20 bg-black/90 p-5 shadow-2xl backdrop-blur-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="contact-drawer-header">
              <div>
                <p className="section-heading">Get to know me</p>
                <h2 id="contact-drawer-title">Start a collaboration</h2>
              </div>
              <button
                type="button"
                className="contact-drawer-close magnetic-btn"
                onClick={onClose}
                aria-label="Close contact panel"
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>
            </div>
            <p className="contact-drawer-intro">
              Reach out for games, films, artist partnerships, and live performance concepts.
            </p>
            <motion.div
              layout
              className={`contact-donate${isSupportExpanded ? ' contact-donate-expanded' : ''}`}
              transition={{ layout: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } }}
            >
              <div className="contact-donate-copy">
                <p className="section-heading">Support / PayPal</p>
                <h3>Support Max's work</h3>
                <p>Help support future music, sound, and visual work.</p>
                <a
                  href={paypal}
                  target="_blank"
                  rel="noreferrer"
                  className="contact-donate-link magnetic-btn"
                >
                  Donate via PayPal
                </a>
              </div>
              {paypalQr ? (
                <img
                  src={paypalQr}
                  alt="PayPal donation QR code for Max Udovichenko"
                  className="contact-donate-qr"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
            </motion.div>
            <AnimatePresence mode="wait" initial={false}>
              {showThankYou ? (
                <motion.div
                  key="thank-you"
                  className="contact-drawer-thank-you"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  role="status"
                  aria-live="polite"
                >
                  <p className="section-heading">Message received</p>
                  <h3>Thank you for reaching out.</h3>
                  <p>
                    A confirmation email should arrive at the address you entered. Max will read your message and respond as soon as he can. Please check your spam or junk folder if you do not see his reply.
                  </p>
                </motion.div>
              ) : isSubmitted ? null : (
                <motion.form
                  key="contact-form"
                  onSubmit={handleSubmit}
                  className="contact-drawer-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                >
              <input type="hidden" name="_subject" value={subject} />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_type" value="lead" />
              <label htmlFor="drawer-name">Name</label>
              <input
                id="drawer-name"
                ref={firstFieldRef}
                name="name"
                type="text"
                autoComplete="name"
                required
              />
              <label htmlFor="drawer-email">Email</label>
              <input id="drawer-email" name="email" type="email" autoComplete="email" required />
              <label htmlFor="drawer-message">Message</label>
              <textarea id="drawer-message" name="message" rows={6} required />
              <label htmlFor="drawer-interest">I’m interested in</label>
              <select
                id="drawer-interest"
                name="interest"
                required
                value={interest}
                onChange={(event) => {
                  setInterest(event.target.value)
                  setBookingDate('')
                  setBookingTime('')
                  setSubmitError(null)
                }}
              >
                <option value="">General enquiry</option>
                <option value={BOOKING_INTEREST}>Booking / studio session</option>
                <option value="Producer / engineer / sound designer">Producer / engineer / sound designer</option>
                <option value="Artist / music collaboration">Artist / music collaboration</option>
                <option value="Research / photography">Research / photography</option>
              </select>
              {isBooking ? (
                <div className="contact-booking-fields">
                  <div>
                    <label htmlFor="drawer-booking-date">Preferred date</label>
                    <input
                      id="drawer-booking-date"
                      name="bookingDate"
                      type="date"
                      min={minimumBookingDate}
                      value={bookingDate}
                      onChange={(event) => {
                        setBookingDate(event.target.value)
                        setBookingTime('')
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="drawer-booking-time">Available time</label>
                    <select
                      id="drawer-booking-time"
                      name="bookingTime"
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      disabled={!bookingDate || availabilityState !== 'ready' || availableTimes.length === 0}
                      required
                    >
                      <option value="">
                        {availabilityState === 'loading'
                          ? 'Loading slots…'
                          : bookingDate && availableTimes.length === 0
                            ? 'No times available'
                            : 'Choose a time'}
                      </option>
                      {availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </div>
                  <p className="contact-drawer-field-note" role="status">
                    {availabilityState === 'error'
                      ? 'Booking availability is temporarily unavailable. Please email Max directly.'
                      : availabilityState === 'ready'
                        ? 'Choose from the slots currently published by Max.'
                        : 'Choose a date to see available times.'}
                  </p>
                </div>
              ) : null}
              <input
                type="text"
                name="_honey"
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
                  <button type="submit" className="contact-drawer-submit magnetic-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send message'}
              </button>
                  {submitError ? <p className="contact-drawer-error" role="alert">{submitError}</p> : null}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
