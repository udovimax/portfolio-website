import { useEffect } from 'react'
import Lenis from 'lenis'

function hasCoarsePointer() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)
  )
}

export function useLenis(enabled: boolean) {
  useEffect(() => {
    // Native touch scrolling is more predictable on phones, especially when a
    // page contains nested carousels, drawers, and a draggable player.
    if (!enabled || hasCoarsePointer()) {
      return
    }

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }

    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [enabled])
}
