import type { CSSProperties, PropsWithChildren } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface GlassCardProps extends PropsWithChildren {
  className?: string
  image?: string
}

export function GlassCard({ className = '', image, children }: GlassCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const cardStyle = image
    ? ({ '--card-art': `url("${image}")` } as CSSProperties)
    : undefined

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 28, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card group relative overflow-hidden rounded-3xl border border-white/20 bg-white/[0.06] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:rotate-[0.2deg] hover:border-white/35 hover:shadow-[0_24px_80px_rgba(80,190,255,0.25)] ${className}`}
      style={cardStyle}
    >
      {image ? <span className="glass-card-art" aria-hidden="true" /> : null}
      <span className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
        <span className="absolute -left-20 top-0 h-60 w-60 rounded-full bg-cyan-300/20 blur-3xl" />
        <span className="absolute -right-24 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
      </span>
      <div className="relative z-10">{children}</div>
    </motion.article>
  )
}
