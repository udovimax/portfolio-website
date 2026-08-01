import { AnimatePresence, motion } from 'framer-motion'
import { FaTimes } from 'react-icons/fa'
import type { ProjectItem, VideoItem } from '../types/content'

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
    <AnimatePresence>
      {isOpen && video && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-2 backdrop-blur-md sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/20 bg-neutral-950 p-3 sm:max-h-[calc(100vh-2rem)] sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="magnetic-btn absolute right-4 top-4 rounded-full border border-white/30 p-2 text-white"
              onClick={onClose}
              aria-label="Close video modal"
            >
              <FaTimes />
            </button>
            <h3 className="mb-1 pr-12 text-xl text-white">{video.title}</h3>
            <p className="mb-3 text-sm text-white/70">{video.description}</p>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ProjectModal({ project, isOpen, onClose }: ProjectModalProps) {
  return (
    <AnimatePresence>
      {isOpen && project && (
        <motion.div
          className="fixed inset-0 z-[65] grid place-items-center bg-black/70 p-2 backdrop-blur-md sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.article
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/20 bg-neutral-950 p-4 sm:max-h-[calc(100vh-2rem)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="magnetic-btn absolute right-4 top-4 rounded-full border border-white/30 p-2 text-white"
              onClick={onClose}
              aria-label="Close project modal"
            >
              <FaTimes />
            </button>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{project.type}</p>
            <h3 className="mb-3 text-3xl text-white">{project.title}</h3>
            <p className="mb-4 text-white/80">{project.description}</p>
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
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
