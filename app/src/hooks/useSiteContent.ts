import { useEffect, useState } from 'react'
import type {
  AboutContent,
  ArchiveContent,
  MusicContent,
  ProjectsContent,
  SiteContent,
  SocialsContent,
  VideosContent,
} from '../types/content'

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }
  return (await response.json()) as T
}

export function assetUrl(path: string) {
  if (/^(https?:|data:|blob:|#)/i.test(path)) {
    return path
  }

  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function resolveContentAssets(
  music: MusicContent,
  projects: ProjectsContent,
  videos: VideosContent,
): Pick<SiteContent, 'music' | 'projects' | 'videos'> {
  return {
    music: {
      ...music,
      tracks: music.tracks.map((track) => ({
        ...track,
        artwork: assetUrl(track.artwork),
        src: assetUrl(track.src),
        downloadLink: track.downloadLink ? assetUrl(track.downloadLink) : undefined,
      })),
    },
    projects: {
      ...projects,
      projects: projects.projects.map((project) => ({
        ...project,
        thumbnail: assetUrl(project.thumbnail),
        gallery: project.gallery.map(assetUrl),
      })),
    },
    videos: {
      ...videos,
      videos: videos.videos.map((video) => ({
        ...video,
        poster: assetUrl(video.poster),
        src: assetUrl(video.src),
        captions: video.captions ? assetUrl(video.captions) : video.captions,
      })),
    },
  }
}

function resolveArchiveAssets(archive: ArchiveContent): ArchiveContent {
  return {
    photos: archive.photos.map((photo) => ({
      ...photo,
      src: assetUrl(photo.src),
    })),
    videos: archive.videos.map((video) => ({
      ...video,
      poster: assetUrl(video.poster),
      preview: assetUrl(video.preview),
      loop: assetUrl(video.loop),
      src: assetUrl(video.src),
    })),
  }
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    Promise.all([
      loadJson<AboutContent>(`${import.meta.env.BASE_URL}content/about.json`),
      loadJson<MusicContent>(`${import.meta.env.BASE_URL}content/music.json`),
      loadJson<ProjectsContent>(`${import.meta.env.BASE_URL}content/projects.json`),
      loadJson<VideosContent>(`${import.meta.env.BASE_URL}content/videos.json`),
      loadJson<ArchiveContent>(`${import.meta.env.BASE_URL}content/archive.json`),
      loadJson<SocialsContent>(`${import.meta.env.BASE_URL}content/socials.json`),
    ])
      .then(([about, music, projects, videos, archive, socials]) => {
        if (!mounted) {
          return
        }
        setContent({
          about,
          socials,
          archive: resolveArchiveAssets(archive),
          ...resolveContentAssets(music, projects, videos),
        })
      })
      .catch((loadError: unknown) => {
        if (!mounted) {
          return
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load site content'
        setError(message)
      })

    return () => {
      mounted = false
    }
  }, [])

  return {
    content,
    error,
    isLoading: !content && !error,
  }
}
