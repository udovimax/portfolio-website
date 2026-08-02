import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PropsWithChildren } from 'react'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa'

interface CarouselProps extends PropsWithChildren {
  label: string
  count: number
  countLabel?: string
  className?: string
  onActiveIndexChange?: (index: number) => void
  showSwipeHint?: boolean
}

function getCardPositions(track: HTMLDivElement) {
  return Array.from(track.children).map((child) => (child as HTMLElement).offsetLeft)
}

export function Carousel({
  label,
  count,
  countLabel = 'works',
  className = '',
  onActiveIndexChange,
  showSwipeHint = false,
  children,
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const activeIndexRef = useRef(0)
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollBounds = useCallback(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0)
    const currentScrollLeft = Math.min(Math.max(track.scrollLeft, 0), maxScrollLeft)
    setCanScrollPrevious(currentScrollLeft > 1)
    setCanScrollNext(currentScrollLeft < maxScrollLeft - 1)

    const cardPositions = getCardPositions(track)
    if (cardPositions.length === 0) return

    const nextActiveIndex = cardPositions.reduce((closestIndex, position, index) => {
      const closestDistance = Math.abs(cardPositions[closestIndex] - currentScrollLeft)
      return Math.abs(position - currentScrollLeft) < closestDistance ? index : closestIndex
    }, 0)

    if (nextActiveIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextActiveIndex
      onActiveIndexChange?.(nextActiveIndex)
    }
  }, [onActiveIndexChange])

  useEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    activeIndexRef.current = 0
    onActiveIndexChange?.(0)
    updateScrollBounds()
    track.addEventListener('scroll', updateScrollBounds, { passive: true })

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollBounds) : null
    resizeObserver?.observe(track)

    return () => {
      track.removeEventListener('scroll', updateScrollBounds)
      resizeObserver?.disconnect()
    }
  }, [count, onActiveIndexChange, updateScrollBounds])

  const scrollByCard = (direction: number) => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0)
    const cardPositions = getCardPositions(track)
    if (cardPositions.length === 0) return

    const targetIndex = Math.min(
      Math.max(activeIndexRef.current + (direction > 0 ? 1 : -1), 0),
      cardPositions.length - 1,
    )
    const targetPosition = Math.min(Math.max(cardPositions[targetIndex], 0), maxScrollLeft)

    activeIndexRef.current = targetIndex
    onActiveIndexChange?.(targetIndex)

    track.scrollTo({
      left: targetPosition,
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
    <div className={`carousel-shell ${className}`} role="region" aria-roledescription="carousel" aria-label={`${label} carousel`}>
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
        <span className="carousel-count">{count} {countLabel}</span>
        {showSwipeHint ? (
          <span className="carousel-swipe-hint" aria-hidden="true">
            <span>Swipe</span>
            <FaArrowRight />
          </span>
        ) : null}
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
