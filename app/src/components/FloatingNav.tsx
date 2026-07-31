import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { NavSection } from '../types/content'

interface FloatingNavProps {
  activePage: NavSection
}

const links: Array<{ id: NavSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'music', label: 'Music' },
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]

export function FloatingNav({ activePage }: FloatingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <motion.nav
        aria-label="Primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="site-nav fixed left-1/2 top-3 z-50 flex w-[min(94vw,56rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-white/20 bg-black/60 px-3 py-2 backdrop-blur-xl sm:top-5 sm:px-4"
      >
        <button
          type="button"
          className="site-nav-button magnetic-btn"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
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
          Contact <span aria-hidden="true">↗</span>
        </a>
      </motion.nav>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="site-menu"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="site-menu fixed left-1/2 top-[4.5rem] z-40 w-[min(90vw,28rem)] -translate-x-1/2 rounded-3xl border border-white/20 bg-black/80 p-3 shadow-2xl backdrop-blur-2xl sm:top-[5.75rem]"
          >
            <p className="px-4 pb-2 pt-2 text-xs uppercase tracking-[0.25em] text-white/45">Explore</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {links.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={() => setMenuOpen(false)}
                    className={`site-menu-link magnetic-btn ${activePage === link.id ? 'site-menu-link-active' : ''}`}
                  >
                    <span>{link.label}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
