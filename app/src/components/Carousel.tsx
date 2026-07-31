import type { PropsWithChildren } from 'react'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa'

interface CarouselProps extends PropsWithChildren {
  label: string
  count: number
}

export function Carousel({ label, count, children }: CarouselProps) {
  const scrollByCard = (direction: number) => {
    const track = document.querySelector<HTMLElement>(`[data-carousel="${label}"]`)
    if (!track) {
      return
    }

    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.82, 280),
      behavior: 'smooth',
    })
  }

  return (
    <div className="carousel-shell" aria-label={`${label} carousel`}>
      <div className="carousel-track" data-carousel={label} tabIndex={0}>
        {children}
      </div>
      <div className="carousel-controls" aria-label={`${label} controls`}>
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
