import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getFocusLoopTarget } from '../utils/focusTrap'
import { isSelectableBookingRange } from '../utils/availability'
import { CONTACT_INTEREST_OPTIONS } from '../utils/contactInterests'
import { validateContactFlowStep, type ContactFlowValues } from '../utils/contactFlow'
import { clampStepIndex, MOBILE_ENQUIRY_STEPS, type MobileEnquiryStep } from '../utils/mobileFunnel'
import {
  dateKey,
  durationHours,
  monthLabel,
  addMonths,
  useContactFlow,
  type ContactFlowController,
} from '../hooks/useContactFlow'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface MobileEnquiryFlowProps {
  isOpen: boolean
  endpointEmail: string
  contactEmail: string
  subject: string
  paypal: string
  paypalQr?: string
  googleSheetsEndpoint?: string
  initialInterest?: string
  contactTriggerRef?: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function bookingValues(flow: ContactFlowController, values: ContactFlowValues = {}): ContactFlowValues {
  return {
    ...values,
    interest: values.interest ?? flow.interest,
    bookingDate: values.bookingDate ?? flow.bookingDate,
    bookingTime: values.bookingTime ?? flow.bookingTime,
    bookingEndTime: values.bookingEndTime ?? flow.bookingEndTime,
    bookingToken: values.bookingToken ?? flow.selectedRange?.bookingToken ?? '',
  }
}

function MobileBookingPicker({ flow }: { flow: ContactFlowController }) {
  return (
    <div className="mobile-enquiry-booking" aria-label="Choose a booking window">
      <div className="mobile-enquiry-booking-header">
        <strong>{monthLabel(flow.calendarMonth)}</strong>
        <div>
          <button
            type="button"
            onClick={() => flow.setCalendarMonth((month) => addMonths(month, -1))}
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => flow.setCalendarMonth((month) => addMonths(month, 1))}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>
      <div className="mobile-enquiry-calendar-weekdays" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="mobile-enquiry-calendar-grid">
        {flow.calendarDays.map((day) => {
          const key = dateKey(day)
          const isCurrentMonth = day.getMonth() === flow.calendarMonth.getMonth()
          const hasSchedule = flow.availableDates.has(key)
          const hasSelectableWindow = (flow.availability[key] || []).some(isSelectableBookingRange)
          const isPast = key < flow.minimumBookingDate
          const isSelected = key === flow.bookingDate
          return (
            <button
              type="button"
              key={key}
              className={isSelected ? 'is-selected' : ''}
              disabled={!isCurrentMonth || !hasSchedule || isPast || flow.availabilityState !== 'ready'}
              onClick={() => flow.selectBookingDate(key)}
              aria-pressed={isSelected}
              aria-label={`${day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${hasSelectableWindow ? ', available to request' : hasSchedule ? ', busy or in transit' : ', unavailable'}`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
      {flow.availableLocations.length > 1 ? (
        <label>
          Studio or rough location
          <select
            value={flow.bookingLocation}
            onChange={(event) => flow.setBookingLocation(event.target.value)}
            disabled={!flow.bookingDate || flow.availabilityState !== 'ready'}
            required
          >
            <option value="">Choose a location</option>
            {flow.availableLocations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
        </label>
      ) : null}
      <div className="mobile-enquiry-time-fields">
        <label>
          Start time
          <select
            value={flow.bookingTime}
            onChange={(event) => flow.setBookingTime(event.target.value)}
            disabled={!flow.bookingDate || flow.availabilityState !== 'ready' || flow.selectedLocationRanges.length === 0}
            required
          >
            <option value="">Choose a start</option>
            {[...new Set(flow.selectedLocationRanges.map((range) => range.start))].map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
        </label>
        <label>
          End time
          <select
            value={flow.bookingEndTime}
            onChange={(event) => flow.setBookingEndTime(event.target.value)}
            disabled={!flow.bookingTime || flow.availableEndTimes.length === 0}
            required
          >
            <option value="">Choose an end</option>
            {flow.availableEndTimes.map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
        </label>
      </div>
      {flow.bookingTypeOptions.length > 1 ? (
        <label>
          What is the session for?
          <select
            value={flow.bookingTypeChoice}
            onChange={(event) => flow.setBookingTypeChoice(event.target.value)}
            required
          >
            <option value="">Choose a type</option>
            {flow.bookingTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
      ) : null}
      {flow.bookingDate && flow.availableRanges.length > 0 ? (
        <div className="mobile-enquiry-public-schedule" aria-label={`Max's public schedule for ${flow.bookingDate}`}>
          <strong>Public schedule</strong>
          {flow.availableRanges.map((range) => (
            <div className={`booking-public-range is-${range.status}`} key={`${range.start}-${range.end}-${range.status}-${range.publicLocation}-${range.bookingToken || 'busy'}`}>
              <span>{range.start}–{range.end}</span>
              <span>{range.status === 'available' ? 'Available to request' : range.status === 'travel' ? 'Travel / transit' : range.status}</span>
              <small>{range.publicLocation} · {range.bookingType}</small>
            </div>
          ))}
        </div>
      ) : null}
      {flow.bookingDate && flow.selectedRange ? (
        <div className="mobile-enquiry-booking-summary" role="status">
          <strong>{flow.selectedRange.publicLocation}</strong>
          <span>{flow.selectedRange.bookingType} · {durationHours(flow.selectedRange)} hour request</span>
          <span>Estimate and travel requirements are confirmed by Max after review.</span>
        </div>
      ) : null}
      <p className="mobile-enquiry-note" role="status">
        {flow.availabilityState === 'error'
          ? 'Booking availability is temporarily unavailable. Please email Max directly.'
          : flow.availabilityState === 'ready'
            ? 'Busy and travel windows are shown only to help you choose a realistic request. Nothing is charged here.'
            : 'Loading Max’s available dates…'}
      </p>
    </div>
  )
}

function StepHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: string }) {
  return (
    <div className="mobile-enquiry-heading">
      <p className="section-heading">{eyebrow}</p>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
    </div>
  )
}

export function MobileEnquiryFlow({
  isOpen,
  endpointEmail,
  contactEmail,
  subject,
  paypal,
  paypalQr,
  googleSheetsEndpoint,
  initialInterest = '',
  contactTriggerRef,
  onClose,
}: MobileEnquiryFlowProps) {
  const flow = useContactFlow({ isOpen, endpointEmail, subject, googleSheetsEndpoint, initialInterest })
  const flowRef = useRef<HTMLElement>(null)
  const firstFieldRef = useRef<HTMLButtonElement>(null)
  const [step, setStep] = useState<MobileEnquiryStep>('intent')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [flowError, setFlowError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setStep('intent')
    setName('')
    setEmail('')
    setMessage('')
    setProjectUrl('')
    setFlowError(null)

    const pageRoot = document.getElementById('root')
    pageRoot?.setAttribute('inert', '')
    const focusFrame = window.requestAnimationFrame(() => firstFieldRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        window.requestAnimationFrame(() => contactTriggerRef?.current?.focus())
        return
      }

      if (event.key === 'Tab' && flowRef.current) {
        const focusable = Array.from(flowRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        const target = getFocusLoopTarget(document.activeElement as HTMLElement | null, focusable, event.shiftKey)
        if (target) {
          event.preventDefault()
          target.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      pageRoot?.removeAttribute('inert')
    }
  }, [contactTriggerRef, isOpen, onClose])

  const close = () => {
    onClose()
    window.requestAnimationFrame(() => contactTriggerRef?.current?.focus())
  }

  const values = bookingValues(flow, { name, email, message, projectUrl })

  const validateStep = (nextStep: MobileEnquiryStep) => {
    const error = validateContactFlowStep(nextStep, values)
    if (error) {
      setFlowError(error)
      return false
    }
    if (nextStep === 'identity' && flow.isCollaboration && !projectUrl.trim()) {
      setFlowError('Add a link to the project you want to discuss.')
      return false
    }
    setFlowError(null)
    return true
  }

  const advance = () => {
    if (step === 'intent' && !validateStep('intent')) return
    if (step === 'details' && !validateStep('details')) return
    if (step === 'identity' && !validateStep('identity')) return
    setStep((current) => MOBILE_ENQUIRY_STEPS[clampStepIndex(MOBILE_ENQUIRY_STEPS.indexOf(current) + 1, MOBILE_ENQUIRY_STEPS.length)])
    setFlowError(null)
  }

  const retreat = () => {
    if (step === 'intent') {
      close()
      return
    }
    setStep((current) => MOBILE_ENQUIRY_STEPS[clampStepIndex(MOBILE_ENQUIRY_STEPS.indexOf(current) - 1, MOBILE_ENQUIRY_STEPS.length)])
    setFlowError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step !== 'review') {
      advance()
      return
    }

    if (!validateStep('review')) return
    const didSubmit = await flow.submit(values)
    if (didSubmit) {
      setStep('success')
      setFlowError(null)
    }
  }

  if (typeof document === 'undefined') return null

  const stepIndex = MOBILE_ENQUIRY_STEPS.indexOf(step)
  const isSuccess = step === 'success'

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="mobile-enquiry-layer">
          <motion.button
            type="button"
            aria-label="Close contact panel"
            className="mobile-enquiry-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            id="mobile-enquiry-flow"
            ref={flowRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-enquiry-title"
            className="mobile-enquiry-flow"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mobile-enquiry-header">
              <div>
                <p className="section-heading">Contact Max</p>
                <h2 id="mobile-enquiry-title">{isSuccess ? 'Enquiry sent' : 'Start a collaboration'}</h2>
              </div>
              <button type="button" className="mobile-enquiry-close magnetic-btn" onClick={close} aria-label="Close contact panel">
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>
            </div>
            {!isSuccess ? (
              <div className="mobile-enquiry-progress" aria-label={`Step ${stepIndex + 1} of ${MOBILE_ENQUIRY_STEPS.length - 1}`}>
                <span style={{ transform: `scaleX(${Math.max(stepIndex, 0) / (MOBILE_ENQUIRY_STEPS.length - 2)})` }} />
                <strong>Step {stepIndex + 1} of {MOBILE_ENQUIRY_STEPS.length - 1}</strong>
              </div>
            ) : null}
            <form className="mobile-enquiry-form" onSubmit={handleSubmit}>
              <div className="mobile-enquiry-scroll-area">
                <AnimatePresence mode="wait" initial={false}>
                  {step === 'intent' ? (
                    <motion.section key="intent" className="mobile-enquiry-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                      <StepHeading eyebrow="01 / Direction" title="What are you working on?">Choose the route that best describes the conversation you want to start.</StepHeading>
                      <div className="mobile-enquiry-interest-list">
                        {CONTACT_INTEREST_OPTIONS.map((option, index) => (
                          <button
                            key={option.value || 'general'}
                            ref={index === 0 ? firstFieldRef : undefined}
                            type="button"
                            className={flow.interest === option.value ? 'is-selected' : ''}
                            aria-pressed={flow.interest === option.value}
                            onClick={() => flow.setInterest(option.value)}
                          >
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <strong>{option.label}</strong>
                          </button>
                        ))}
                      </div>
                    </motion.section>
                  ) : null}
                  {step === 'details' ? (
                    <motion.section key="details" className="mobile-enquiry-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                      <StepHeading eyebrow="02 / Brief" title="Tell Max about it">A little context helps Max understand the shape of the work.</StepHeading>
                      <label htmlFor="mobile-enquiry-message">What would you like to discuss?</label>
                      <textarea id="mobile-enquiry-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={5} autoFocus required />
                      {flow.isBooking ? <MobileBookingPicker flow={flow} /> : null}
                      {flow.isBooking ? <p className="mobile-enquiry-note">Choose a window to request. Max confirms the final booking, location, travel time, and price.</p> : null}
                    </motion.section>
                  ) : null}
                  {step === 'identity' ? (
                    <motion.section key="identity" className="mobile-enquiry-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                      <StepHeading eyebrow="03 / Reply" title="Where can Max reach you?">Your details stay with the enquiry so Max can respond directly.</StepHeading>
                      <label htmlFor="mobile-enquiry-name">Name</label>
                      <input id="mobile-enquiry-name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
                      <label htmlFor="mobile-enquiry-email">Email</label>
                      <input id="mobile-enquiry-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                      <label htmlFor="mobile-enquiry-project-url">{flow.isCollaboration ? 'Project link (required)' : 'Project or reference link (optional)'}</label>
                      <input id="mobile-enquiry-project-url" type="url" inputMode="url" autoComplete="url" placeholder="https://your-project-link.com" value={projectUrl} onChange={(event) => setProjectUrl(event.target.value)} required={flow.isCollaboration} />
                      <p className="mobile-enquiry-note">No account, payment, or personal tracking is required.</p>
                    </motion.section>
                  ) : null}
                  {step === 'review' ? (
                    <motion.section key="review" className="mobile-enquiry-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                      <StepHeading eyebrow="04 / Check" title="Ready to send?">Review the request before Max receives it.</StepHeading>
                      <dl className="mobile-enquiry-review">
                        <div><dt>Direction</dt><dd>{flow.interest || 'General enquiry'}</dd></div>
                        <div><dt>Message</dt><dd>{message}</dd></div>
                        <div><dt>From</dt><dd>{name} · {email}</dd></div>
                        {flow.isBooking && flow.selectedRange ? (
                          <div><dt>Booking request</dt><dd>{flow.bookingDate} · {flow.bookingTime}–{flow.bookingEndTime} · {flow.selectedRange.publicLocation} · {flow.selectedRange.bookingType}</dd></div>
                        ) : null}
                      </dl>
                      <p className="mobile-enquiry-note">Max confirms availability, travel requirements, and any final price after reviewing the request. This form never charges you.</p>
                    </motion.section>
                  ) : null}
                  {step === 'success' ? (
                    <motion.section key="success" className="mobile-enquiry-step mobile-enquiry-success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                      <p className="section-heading">Message received</p>
                      <h3>Thank you for reaching out.</h3>
                      <p>A confirmation email should arrive at the address you entered. Max will read your message and respond as soon as he can.</p>
                      <p>If the form does not complete, <a href={`mailto:${contactEmail}`}>email Max directly</a>.</p>
                      <div className="mobile-enquiry-support">
                        <div>
                          <p className="section-heading">Support / PayPal</p>
                          <h4>Support Max’s work</h4>
                          <a href={paypal} target="_blank" rel="noreferrer" className="mobile-enquiry-support-link magnetic-btn">Donate via PayPal</a>
                        </div>
                        {paypalQr ? <img src={paypalQr} alt="PayPal donation QR code for Max Udovichenko" loading="lazy" decoding="async" /> : null}
                      </div>
                    </motion.section>
                  ) : null}
                </AnimatePresence>
              </div>
              {flowError ? <p className="mobile-enquiry-error" role="alert">{flowError}</p> : null}
              {flow.submitError ? <p className="mobile-enquiry-error" role="alert">{flow.submitError}</p> : null}
              {!isSuccess ? (
                <div className="mobile-enquiry-navigation">
                  <button type="button" className="mobile-enquiry-back magnetic-btn" onClick={retreat}>{step === 'intent' ? 'Close' : 'Back'}</button>
                  {step === 'review' ? (
                    <button type="submit" className="mobile-enquiry-next magnetic-btn" disabled={flow.isSubmitting}>{flow.isSubmitting ? 'Sending…' : 'Send enquiry'}</button>
                  ) : (
                    <button type="submit" className="mobile-enquiry-next magnetic-btn">Continue</button>
                  )}
                </div>
              ) : (
                <button type="button" className="mobile-enquiry-next magnetic-btn" onClick={close}>Done</button>
              )}
            </form>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
