import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FaTimes } from 'react-icons/fa'
import { getFocusLoopTarget } from '../utils/focusTrap'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])'

interface ModalDialogProps {
  isOpen: boolean
  titleId: string
  title: string
  description?: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
  panelClassName: string
}

export function ModalDialog({
  isOpen,
  titleId,
  title,
  description,
  closeLabel,
  onClose,
  children,
  panelClassName,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    const pageRoot = document.getElementById('root')
    const previousFocus = document.activeElement as HTMLElement | null
    pageRoot?.setAttribute('inert', '')

    const focusFrame = window.requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      focusable?.[0]?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
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
      if (previousFocus && document.contains(previousFocus)) {
        window.requestAnimationFrame(() => previousFocus.focus())
      }
    }
  }, [isOpen])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-2 backdrop-blur-md sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={panelClassName}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl text-white sm:text-2xl">{title}</h2>
                {description ? <p className="mt-1 text-sm text-white/70">{description}</p> : null}
              </div>
              <button
                type="button"
                className="magnetic-btn shrink-0 rounded-full border border-white/30 p-2 text-white"
                onClick={onClose}
                aria-label={closeLabel}
              >
                <FaTimes aria-hidden="true" />
              </button>
            </header>
            {children}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
