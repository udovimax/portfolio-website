import { useEffect, useState } from 'react'
import type {
  AboutContent,
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

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    Promise.all([
      loadJson<AboutContent>('/content/about.json'),
      loadJson<MusicContent>('/content/music.json'),
      loadJson<ProjectsContent>('/content/projects.json'),
      loadJson<VideosContent>('/content/videos.json'),
      loadJson<SocialsContent>('/content/socials.json'),
    ])
      .then(([about, music, projects, videos, socials]) => {
        if (!mounted) {
          return
        }
        setContent({ about, music, projects, videos, socials })
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
