import { motion } from 'framer-motion'
import type { NavSection } from '../types/content'

interface FloatingNavProps {
  hidden: boolean
  activeSection: NavSection
}

const links: Array<{ id: NavSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'music', label: 'Music' },
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]

export function FloatingNav({ hidden, activeSection }: FloatingNavProps) {
  return (
    <motion.nav
      aria-label="Primary"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? -20 : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="floating-nav fixed left-1/2 top-4 z-50 w-[min(94vw,46rem)] -translate-x-1/2 rounded-full border border-white/20 bg-black/55 p-2 backdrop-blur-xl"
    >
      <ul className="flex items-center justify-between gap-1">
        {links.map((link) => (
          <li key={link.id} className="flex-1">
            <a
              href={`#${link.id}`}
              className={`magnetic-btn block rounded-full px-3 py-2 text-center text-xs uppercase tracking-[0.2em] transition ${
                activeSection === link.id
                  ? 'nav-link-active bg-[var(--accent)] text-[#071019]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </motion.nav>
  )
}
