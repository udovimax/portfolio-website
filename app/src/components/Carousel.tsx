import { useEffect, useRef, useState, type KeyboardEvent, type PropsWithChildren } from 'react'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa'

interface CarouselProps extends PropsWithChildren {
  label: string
  count: number
}

export function Carousel({ label, count, children }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollBounds = () => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0)
    const currentScrollLeft = Math.min(Math.max(track.scrollLeft, 0), maxScrollLeft)
    setCanScrollPrevious(currentScrollLeft > 1)
    setCanScrollNext(currentScrollLeft < maxScrollLeft - 1)
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    updateScrollBounds()
    track.addEventListener('scroll', updateScrollBounds, { passive: true })

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollBounds) : null
    resizeObserver?.observe(track)

    return () => {
      track.removeEventListener('scroll', updateScrollBounds)
      resizeObserver?.disconnect()
    }
  }, [count])

  const scrollByCard = (direction: number) => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0)
    const currentScrollLeft = Math.min(Math.max(track.scrollLeft, 0), maxScrollLeft)
    const trackLeft = track.getBoundingClientRect().left
    const cardPositions = Array.from(track.children)
      .map((child) => (child as HTMLElement).getBoundingClientRect().left - trackLeft + track.scrollLeft)
      .filter((position) => position >= 0 && position <= maxScrollLeft + 1)

    const targetPosition = direction > 0
      ? cardPositions.find((position) => position > currentScrollLeft + 4) ?? maxScrollLeft
      : [...cardPositions].reverse().find((position) => position < currentScrollLeft - 4) ?? 0

    track.scrollTo({
      left: Math.min(Math.max(targetPosition, 0), maxScrollLeft),
      behavior: 'smooth',
    })
  }

  const handleTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      scrollByCard(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  return (
    <div className="carousel-shell" role="region" aria-roledescription="carousel" aria-label={`${label} carousel`}>
      <div
        ref={trackRef}
        className="carousel-track"
        data-carousel={label}
        tabIndex={0}
        aria-label={`${label} items. Use horizontal scrolling or the arrow keys to browse.`}
        onKeyDown={handleTrackKeyDown}
      >
        {children}
      </div>
      <div className="carousel-controls" role="group" aria-label={`${label} controls`}>
        <span className="carousel-count">{count} works</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="carousel-button magnetic-btn"
            aria-label={`Previous ${label}`}
            disabled={!canScrollPrevious}
            onClick={() => scrollByCard(-1)}
          >
            <FaArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="carousel-button magnetic-btn"
            aria-label={`Next ${label}`}
            disabled={!canScrollNext}
            onClick={() => scrollByCard(1)}
          >
            <FaArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
