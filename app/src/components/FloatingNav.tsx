import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { NavSection } from '../types/content'

interface FloatingNavProps {
  activePage: NavSection
}

const links: Array<{ id: NavSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
]

export function FloatingNav({ activePage }: FloatingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusFrame = window.requestAnimationFrame(() => {
      menuPanelRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        window.requestAnimationFrame(() => menuTriggerRef.current?.focus())
        return
      }

      if (event.key !== 'Tab' || !menuPanelRef.current) {
        return
      }

      const focusable = Array.from(menuPanelRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (!focusable.length) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <>
      <motion.nav
        aria-label="Primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="site-nav fixed left-1/2 top-3 z-50 flex w-[min(94vw,56rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-white/20 bg-black/60 px-3 py-2 backdrop-blur-xl sm:top-5 sm:px-4"
      >
        <button
          type="button"
          ref={menuTriggerRef}
          className="site-nav-button magnetic-btn"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-haspopup="dialog"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="site-nav-menu-icon" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
        </button>

        <a href="#home" className="site-nav-title" onClick={() => setMenuOpen(false)}>
          MAX UDOVICHENKO
        </a>

        <a href="#contact" className="site-nav-button magnetic-btn" onClick={() => setMenuOpen(false)}>
          Contact
        </a>
      </motion.nav>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="site-menu-backdrop fixed inset-0 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              id="site-menu"
              ref={menuPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="site-menu-title"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="site-menu fixed left-0 top-0 z-40 h-dvh w-[min(50vw,36rem)] border-r border-white/20 bg-black/85 p-3 shadow-2xl backdrop-blur-2xl"
            >
              <div className="site-menu-content">
                <p id="site-menu-title" className="px-3 pb-4 pt-3 text-xs uppercase tracking-[0.25em] text-white/45">
                  Explore
                </p>
                <ul className="grid gap-1">
                  {links.map((link) => (
                    <li key={link.id}>
                      <a
                        href={`#${link.id}`}
                        onClick={() => setMenuOpen(false)}
                        className={`site-menu-link magnetic-btn ${activePage === link.id ? 'site-menu-link-active' : ''}`}
                      >
                        <span>{link.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
