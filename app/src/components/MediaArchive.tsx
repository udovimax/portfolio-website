import { FaPlay } from 'react-icons/fa'
import { Carousel } from './Carousel'
import { LazyBackgroundVideo } from './LazyBackgroundVideo'
import type { ArchiveContent, ArchiveVideo } from '../types/content'

interface MediaArchiveProps {
  archive: ArchiveContent
  onOpenVideo: (video: ArchiveVideo) => void
  onActiveIndexChange?: (index: number) => void
  immersive?: boolean
}

export function MediaArchive({ archive, onOpenVideo, onActiveIndexChange, immersive = false }: MediaArchiveProps) {
  return (
    <div className="media-archive">
      <div>
        <Carousel
          label="Highlight archive"
          count={archive.videos.length}
          countLabel="clips"
          className={`archive-video-carousel ${immersive ? 'work-immersive-carousel' : ''}`}
          onActiveIndexChange={onActiveIndexChange}
        >
          {archive.videos.map((video) => (
            <div className="carousel-item" key={video.id}>
              <article className={`archive-video-card ${immersive ? 'archive-video-card-immersive' : ''}`}>
                {!immersive ? (
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
                ) : null}
                <div className="archive-video-copy">
                  <p className="section-heading">Instagram highlight / {video.duration}</p>
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
