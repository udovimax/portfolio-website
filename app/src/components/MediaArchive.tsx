/**
 * Purpose: Present the video archive as a readable, vertically bounded list.
 *
 * Responsibilities: Render lightweight poster/loop previews and open the selected video modal.
 * Constraints: Keep video playback lazy and muted; the list must not create a horizontal scroll
 * surface because the work pages are intentionally touch-first and informative.
 */
import { FaPlay } from 'react-icons/fa'
import type { CSSProperties } from 'react'
import { LazyBackgroundVideo } from './LazyBackgroundVideo'
import type { ArchiveContent, ArchiveVideo } from '../types/content'

interface MediaArchiveProps {
  archive: ArchiveContent
  onOpenVideo: (video: ArchiveVideo) => void
}

export function MediaArchive({ archive, onOpenVideo }: MediaArchiveProps) {
  return (
    <div className="media-archive-list" aria-label="Video archive">
      {archive.videos.map((video, index) => (
        <article
          className="archive-video-list-item"
          key={video.id}
          style={{ '--archive-art': `url("${video.poster}")` } as CSSProperties}
        >
          <div className="archive-video-list-image">
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
            <p className="section-heading">Video / {String(index + 1).padStart(2, '0')}</p>
            <h2>{video.title}</h2>
            <p>{video.description}</p>
            <button type="button" className="magnetic-btn archive-open-button" onClick={() => onOpenVideo(video)}>
              Open video
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
