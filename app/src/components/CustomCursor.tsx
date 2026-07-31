import { useEffect, useState } from 'react'

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [hoveringInteractive, setHoveringInteractive] = useState(false)

  useEffect(() => {
    if ('ontouchstart' in window) {
      return
    }

    const onMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY })
    }

    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }
      const isInteractive = Boolean(
        target.closest('a, button, input, textarea, select, [data-cursor-reactive]'),
      )
      setHoveringInteractive(isInteractive)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
    }
  }, [])

  if ('ontouchstart' in window) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed z-[100] hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border transition duration-150 md:block ${
        hoveringInteractive
          ? 'scale-150 border-cyan-300 bg-cyan-300/20'
          : 'scale-100 border-white/60 bg-white/10'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  )
}
