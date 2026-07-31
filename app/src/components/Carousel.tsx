import { useRef, type KeyboardEvent, type PropsWithChildren } from 'react'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa'

interface CarouselProps extends PropsWithChildren {
  label: string
  count: number
}

export function Carousel({ label, count, children }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scrollByCard = (direction: number) => {
    const track = trackRef.current
    if (!track) {
      return
    }

    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.82, 280),
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
            onClick={() => scrollByCard(-1)}
          >
            <FaArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="carousel-button magnetic-btn"
            aria-label={`Next ${label}`}
            onClick={() => scrollByCard(1)}
          >
            <FaArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
