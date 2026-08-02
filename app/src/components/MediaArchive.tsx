import { FaPlay } from 'react-icons/fa'
import { Carousel } from './Carousel'
import { LazyBackgroundVideo } from './LazyBackgroundVideo'
import type { ArchiveContent, ArchiveVideo } from '../types/content'

interface MediaArchiveProps {
  archive: ArchiveContent
  onOpenVideo: (video: ArchiveVideo) => void
  onActiveIndexChange?: (index: number) => void
}

export function MediaArchive({ archive, onOpenVideo, onActiveIndexChange }: MediaArchiveProps) {
  return (
    <div className="media-archive">
      <div>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="section-heading">Moving studies</p>
            <h3 className="mt-2 text-3xl text-white sm:text-4xl">Highlight archive</h3>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-white/45">GIF previews / lazy video</span>
        </div>
        <Carousel
          label="Highlight archive"
          count={archive.videos.length}
          countLabel="clips"
          className="archive-video-carousel"
          onActiveIndexChange={onActiveIndexChange}
        >
          {archive.videos.map((video) => (
            <div className="carousel-item" key={video.id}>
              <article className="archive-video-card">
                <div className="archive-video-preview">
                  <LazyBackgroundVideo
                    src={video.loop}
                    poster={video.poster}
                    className="archive-video-preview-media"
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
