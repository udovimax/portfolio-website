import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

interface ContactDrawerProps {
  isOpen: boolean
  endpointEmail: string
  subject: string
  paypal: string
  paypalQr?: string
  onClose: () => void
}

export function ContactDrawer({ isOpen, endpointEmail, subject, paypal, paypalQr, onClose }: ContactDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

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
            tabIndex={0}
            data-lenis-prevent
            className="contact-drawer fixed right-0 top-0 h-dvh w-[min(100vw,30rem)] overflow-y-auto border-l border-white/20 bg-black/90 p-5 shadow-2xl backdrop-blur-2xl sm:p-8"
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
                ref={closeButtonRef}
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
            <div className="contact-donate">
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
            </div>
            <form
              action={`https://formsubmit.co/${endpointEmail}`}
              method="POST"
              className="contact-drawer-form"
            >
              <input type="hidden" name="_subject" value={subject} />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_next" value={`${window.location.origin}${window.location.pathname}#about`} />
              <label htmlFor="drawer-name">Name</label>
              <input id="drawer-name" name="name" type="text" autoComplete="name" required />
              <label htmlFor="drawer-email">Email</label>
              <input id="drawer-email" name="email" type="email" autoComplete="email" required />
              <label htmlFor="drawer-message">Message</label>
              <textarea id="drawer-message" name="message" rows={6} required />
              <input
                type="text"
                name="_honey"
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <button type="submit" className="contact-drawer-submit magnetic-btn">
                Send message
              </button>
            </form>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
