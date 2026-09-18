import type { ProjectItem, VideoItem } from '../types/content'
import { ModalDialog } from './ModalDialog'

interface VideoModalProps {
  video: VideoItem | null
  isOpen: boolean
  onClose: () => void
  onTimeUpdate: (id: string, value: number) => void
  resumeTime?: number
}

interface ProjectModalProps {
  project: ProjectItem | null
  isOpen: boolean
  onClose: () => void
}

export function VideoModal({
  video,
  isOpen,
  onClose,
  onTimeUpdate,
  resumeTime,
}: VideoModalProps) {
  return (
    <ModalDialog
      isOpen={isOpen && Boolean(video)}
      titleId="video-modal-title"
      title={video?.title || 'Video'}
      description={video?.description}
      closeLabel="Close video modal"
      onClose={onClose}
      panelClassName="relative max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/20 bg-neutral-950 p-3 sm:max-h-[calc(100vh-2rem)] sm:p-4"
    >
      {video ? (
        <>
            <video
              key={video.id}
              className="max-h-[58dvh] w-full rounded-2xl sm:max-h-[75vh]"
              controls
              autoPlay
              playsInline
              preload="metadata"
              poster={video.poster}
              onLoadedMetadata={(event) => {
                if (!resumeTime) {
                  return
                }
                event.currentTarget.currentTime = resumeTime
              }}
              onTimeUpdate={(event) =>
                onTimeUpdate(video.id, event.currentTarget.currentTime)
              }
            >
              <source src={video.src} type="video/mp4" />
              {video.captions ? (
                <track kind="captions" src={video.captions} label="English" srcLang="en" default />
              ) : null}
            </video>
            <p className="mt-3 text-xs text-white/60" role="status">
              {video.captions
                ? 'English captions are available in the player settings.'
                : 'Captions are not available for this video.'}
            </p>
        </>
      ) : null}
    </ModalDialog>
  )
}

export function ProjectModal({ project, isOpen, onClose }: ProjectModalProps) {
  return (
    <ModalDialog
      isOpen={isOpen && Boolean(project)}
      titleId="project-modal-title"
      title={project?.title || 'Project'}
      description={project?.description}
      closeLabel="Close project modal"
      onClose={onClose}
      panelClassName="relative max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/20 bg-neutral-950 p-4 sm:max-h-[calc(100vh-2rem)] sm:p-6"
    >
      {project ? (
        <>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{project.type}</p>
            <ul className="mb-4 flex flex-wrap gap-2">
              {project.technologies.map((technology) => (
                <li
                  key={`${project.id}-${technology}`}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80"
                >
                  {technology}
                </li>
              ))}
            </ul>
            <div className="grid gap-4 sm:grid-cols-2">
              {project.gallery.map((image, index) => (
                <img
                  key={`${project.id}-image-${index}`}
                  src={image}
                  loading="lazy"
                  className="h-48 w-full rounded-2xl object-cover"
                  alt={`${project.title} gallery item ${index + 1}`}
                />
              ))}
            </div>
            {project.links.length > 0 ? (
              <nav className="mt-5 flex flex-wrap gap-3" aria-label={`${project.title} links`}>
                {project.links.map((link) => {
                  const isExternal = /^https?:\/\//i.test(link.url)
                  return (
                    <a
                      key={`${project.id}-${link.label}`}
                      href={link.url}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noreferrer' : undefined}
                      onClick={() => {
                        if (!isExternal) onClose()
                      }}
                      className="magnetic-btn rounded-full border border-cyan-300/50 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                    >
                      {link.label}
                    </a>
                  )
                })}
              </nav>
            ) : null}
        </>
      ) : null}
    </ModalDialog>
  )
}
