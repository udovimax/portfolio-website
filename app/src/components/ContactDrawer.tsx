import { useEffect, useRef, type FormEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getFocusLoopTarget } from '../utils/focusTrap'
import { isSelectableBookingRange } from '../utils/availability'
import {
  CONTACT_INTEREST_OPTIONS,
} from '../utils/contactInterests'
import { dateKey, durationHours, monthLabel, addMonths, useContactFlow } from '../hooks/useContactFlow'
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ContactDrawerProps {
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

export function ContactDrawer({
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
}: ContactDrawerProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  const {
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
    minimumBookingDate,
    availability,
    availabilityState,
    availableDates,
    availableRanges,
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
  } = useContactFlow({ isOpen, endpointEmail, subject, googleSheetsEndpoint, initialInterest })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const pageRoot = document.getElementById('root')
    pageRoot?.setAttribute('inert', '')

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    const focusFrame = isTouchDevice
      ? null
      : window.requestAnimationFrame(() => firstFieldRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        window.requestAnimationFrame(() => contactTriggerRef?.current?.focus())
        return
      }

      if (event.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        const target = getFocusLoopTarget(document.activeElement as HTMLElement | null, focusable, event.shiftKey)
        if (target) {
          event.preventDefault()
          target.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      if (focusFrame !== null) {
        window.cancelAnimationFrame(focusFrame)
      }
      document.removeEventListener('keydown', onKeyDown)
      pageRoot?.removeAttribute('inert')
    }
  }, [contactTriggerRef, initialInterest, isOpen, onClose])

  const handleClose = () => {
    onClose()
    window.requestAnimationFrame(() => contactTriggerRef?.current?.focus())
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting || isSubmitted) {
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const value = (name: string) => String(formData.get(name) || '')
    const didSubmit = await submit({
      interest: value('interest'),
      name: value('name'),
      email: value('email'),
      message: value('message'),
      projectUrl: value('projectUrl'),
      bookingDate: value('bookingDate'),
      bookingTime: value('bookingTime'),
      bookingEndTime: value('bookingEndTime'),
      bookingToken: value('bookingToken'),
    })
    if (didSubmit) form.reset()
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
            onClick={handleClose}
          />
          <motion.aside
            id="contact-drawer"
            ref={drawerRef}
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
                onClick={handleClose}
                aria-label="Close contact panel"
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>
            </div>
            <p className="contact-drawer-intro">
              Reach out for games, films, artist partnerships, and live performance concepts.
            </p>
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
                  <p>
                    If the form does not complete, <a href={`mailto:${contactEmail}`}>email Max directly</a>.
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
              <label htmlFor="drawer-interest">I’m interested in</label>
              <select
                id="drawer-interest"
                name="interest"
                required
                value={interest}
                onChange={(event) => {
                  setInterest(event.target.value)
                }}
              >
                {CONTACT_INTEREST_OPTIONS.map((option) => (
                  <option key={option.value || 'general'} value={option.value}>{option.label}</option>
                ))}
              </select>
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
              <textarea id="drawer-message" name="message" rows={isBooking ? 3 : 6} required />
              <div className="contact-collaboration-field">
                <label htmlFor="drawer-project-url">{isCollaboration ? 'Project link (required)' : 'Project or reference link (optional)'}</label>
                <input
                  id="drawer-project-url"
                  name="projectUrl"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://your-project-link.com"
                  required={isCollaboration}
                />
                <p className="contact-drawer-field-note">
                  {isCollaboration
                    ? 'Share a public or private link to the project you want to discuss.'
                    : 'Add a link if it helps Max understand your enquiry.'}
                </p>
              </div>
              {isBooking ? (
                <div className="contact-booking-fields">
                  <div className="booking-calendar" aria-label="Available booking dates">
                    <div className="booking-calendar-header">
                      <strong>{monthLabel(calendarMonth)}</strong>
                      <div>
                        <button type="button" onClick={() => setCalendarMonth((month) => addMonths(month, -1))} aria-label="Previous month">←</button>
                        <button type="button" onClick={() => setCalendarMonth((month) => addMonths(month, 1))} aria-label="Next month">→</button>
                      </div>
                    </div>
                    <div className="booking-calendar-weekdays" aria-hidden="true">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                    </div>
                    <div className="booking-calendar-grid">
                      {calendarDays.map((day) => {
                        const key = dateKey(day)
                        const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                        const hasSchedule = availableDates.has(key)
                        const hasSelectableWindow = (availability[key] || []).some(isSelectableBookingRange)
                        const isSelected = key === bookingDate
                        const isPast = key < minimumBookingDate
                        return (
                          <button
                            type="button"
                            key={key}
                            className={isSelected ? 'is-selected' : ''}
                            disabled={!isCurrentMonth || !hasSchedule || isPast || availabilityState !== 'ready'}
                            onClick={() => {
                              selectBookingDate(key)
                            }}
                            aria-pressed={isSelected}
                            aria-label={`${day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${hasSelectableWindow ? ', available to request' : hasSchedule ? ', busy or in transit' : ', unavailable'}`}
                          >
                            {day.getDate()}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <input type="hidden" name="bookingDate" value={bookingDate} />
                  <input type="hidden" name="bookingToken" value={selectedRange?.bookingToken || ''} />
                  <input type="hidden" name="bookingPublicLocation" value={bookingLocation} />
                  {availableLocations.length > 1 ? (
                    <div className="booking-location-field">
                      <label htmlFor="drawer-booking-location">Studio or location</label>
                      <select
                        id="drawer-booking-location"
                        value={bookingLocation}
                        onChange={(event) => {
                          setBookingLocation(event.target.value)
                          setBookingTime('')
                          setBookingEndTime('')
                          setBookingTypeChoice('')
                        }}
                        disabled={!bookingDate || availabilityState !== 'ready'}
                        required
                      >
                        <option value="">Choose a location</option>
                        {availableLocations.map((location) => <option key={location} value={location}>{location}</option>)}
                      </select>
                    </div>
                  ) : null}
                  <div className="booking-time-fields">
                    <div>
                      <label htmlFor="drawer-booking-time">Start time</label>
                      <select
                        id="drawer-booking-time"
                        name="bookingTime"
                        value={bookingTime}
                        onChange={(event) => {
                          setBookingTime(event.target.value)
                          setBookingEndTime('')
                          setBookingTypeChoice('')
                        }}
                        disabled={!bookingDate || availabilityState !== 'ready' || selectedLocationRanges.length === 0}
                        required
                      >
                        <option value="">Choose a start</option>
                        {[...new Set(selectedLocationRanges.map((range) => range.start))].map((time) => <option key={time} value={time}>{time}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="drawer-booking-end-time">End time</label>
                      <select
                        id="drawer-booking-end-time"
                        name="bookingEndTime"
                        value={bookingEndTime}
                        onChange={(event) => {
                          setBookingEndTime(event.target.value)
                          setBookingTypeChoice('')
                        }}
                        disabled={!bookingTime || availableEndTimes.length === 0}
                        required
                      >
                        <option value="">Choose an end</option>
                        {availableEndTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                      </select>
                    </div>
                  </div>
                  {bookingTypeOptions.length > 1 ? (
                    <div className="booking-location-field">
                      <label htmlFor="drawer-booking-type">Booking type</label>
                      <select
                        id="drawer-booking-type"
                        value={bookingTypeChoice}
                        onChange={(event) => setBookingTypeChoice(event.target.value)}
                        required
                      >
                        <option value="">Choose a booking type</option>
                        {bookingTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                  ) : null}
                  {bookingDate && availableRanges.length > 0 ? (
                    <div className="booking-public-schedule" aria-label={`Max's schedule for ${bookingDate}`}>
                      <strong>Max’s schedule</strong>
                      {availableRanges.map((range) => (
                        <div className={`booking-public-range is-${range.status}`} key={`${range.start}-${range.end}-${range.status}-${range.publicLocation}-${range.bookingToken || 'busy'}`}>
                          <span>{range.start}–{range.end}</span>
                          <span>{range.status === 'available' ? 'Available to request' : range.status === 'travel' ? 'Travel / transit' : range.status}</span>
                          <small>{range.publicLocation} · {range.bookingType}</small>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {bookingDate && selectedRange ? (
                    <div className="booking-selection-summary" role="status">
                      <strong>{selectedRange.publicLocation}</strong>
                      <span>{selectedRange.bookingType} · {durationHours(selectedRange)} hour request</span>
                      <span>Max confirms the final price and travel requirements after reviewing the request; this form never charges you.</span>
                    </div>
                  ) : null}
                  <p className="contact-drawer-field-note" role="status">
                    {availabilityState === 'error'
                      ? 'Booking availability is temporarily unavailable. Please email Max directly.'
                      : availabilityState === 'ready'
                        ? 'Busy and travel windows are shown for context. Choose an available window to request a booking estimate.'
                        : 'Loading Max’s available dates…'}
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
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
