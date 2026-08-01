import { FaPlay } from 'react-icons/fa'
import { useReducedMotion } from 'framer-motion'
import { Carousel } from './Carousel'
import { LazyBackgroundVideo } from './LazyBackgroundVideo'
import type { ArchiveContent, ArchiveVideo } from '../types/content'

interface MediaArchiveProps {
  archive: ArchiveContent
  onOpenVideo: (video: ArchiveVideo) => void
}

export function MediaArchive({ archive, onOpenVideo }: MediaArchiveProps) {
  const featuredVideo = archive.videos[0]
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="media-archive">
      {featuredVideo ? (
        <div className="archive-ambient-panel">
          <LazyBackgroundVideo
            src={featuredVideo.loop}
            poster={featuredVideo.poster}
            className="archive-ambient-video"
          />
          <div className="archive-ambient-scrim" aria-hidden="true" />
          <div className="archive-ambient-copy">
            <p className="section-heading">Moving archive / {archive.videos.length} studies</p>
            <h2 className="text-4xl font-semibold text-white sm:text-6xl">Music in motion</h2>
            <p className="max-w-xl text-white/75">
              Short fragments from Max&apos;s Instagram highlights, edited into quiet loops and stills for the site.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="section-heading">Moving studies</p>
            <h3 className="mt-2 text-3xl text-white sm:text-4xl">Highlight archive</h3>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-white/45">GIF previews / lazy video</span>
        </div>
        <Carousel label="Highlight archive" count={archive.videos.length} countLabel="clips" className="archive-video-carousel">
          {archive.videos.map((video) => (
            <div className="carousel-item" key={video.id}>
              <article className="archive-video-card">
                <div className="archive-video-preview">
                  <img
                    src={shouldReduceMotion ? video.poster : video.preview}
                    alt={`${video.title} preview`}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="archive-video-badge" aria-hidden="true">
                    <FaPlay />
                  </span>
                  <span className="archive-video-duration">{video.duration}</span>
                </div>
                <div className="archive-video-copy">
                  <p className="section-heading">Instagram highlight</p>
                  <h4>{video.title}</h4>
                  <p>{video.description}</p>
                  <button type="button" className="magnetic-btn archive-open-button" onClick={() => onOpenVideo(video)}>
                    Open video
                  </button>
                </div>
              </article>
            </div>
          ))}
        </Carousel>
      </div>

    </div>
  )
}
