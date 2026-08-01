import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

interface LazyBackgroundVideoProps {
  src: string
  poster: string
  className?: string
}

export function LazyBackgroundVideo({ src, poster, className = '' }: LazyBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const video = videoRef.current
    if (!video || shouldReduceMotion) {
      return
    }

    const loadVideo = () => {
      if (video.dataset.loaded === 'true') {
        return
      }

      video.src = src
      video.dataset.loaded = 'true'
      video.load()
      void video.play().catch(() => undefined)
    }

    if (typeof IntersectionObserver === 'undefined') {
      loadVideo()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadVideo()
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' },
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [shouldReduceMotion, src])

  return (
    <video
      ref={videoRef}
      className={className}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  )
}
