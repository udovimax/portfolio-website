export type NavSection = 'home' | 'music' | 'projects' | 'about' | 'contact'

export interface AboutTimelineItem {
  year: string
  title: string
  description: string
}

export interface AboutContent {
  name: string
  roles: string[]
  intro: string
  philosophy: string
  timeline: AboutTimelineItem[]
  skills: string[]
}

export interface Track {
  id: string
  title: string
  artist: string
  year: number
  description: string
  duration: string
  credits: string
  artwork: string
  streamingSource: 'local' | 'soundcloud'
  src: string
  downloadLink?: string
  lyrics?: string
}

export interface MusicContent {
  featuredAlbum: string
  description: string
  tracks: Track[]
  soundcloud: {
    title: string
    embedUrl: string
  }
}

export interface ProjectLink {
  label: string
  url: string
}

export interface ProjectItem {
  id: string
  title: string
  type: string
  year: number
  description: string
  technologies: string[]
  thumbnail: string
  gallery: string[]
  videoId?: string
  links: ProjectLink[]
}

export interface ProjectsContent {
  projects: ProjectItem[]
}

export interface VideoItem {
  id: string
  title: string
  description: string
  duration: string
  poster: string
  src: string
  captions?: string
}

export interface VideosContent {
  videos: VideoItem[]
}

export interface SocialsContent {
  email: string
  spotify: string
  instagram: string
  instagramPosts?: string[]
  instagramHighlight?: string
  youtube: string
  soundcloud: string
  formsubmit: {
    endpointEmail: string
    subject: string
  }
}

export interface SiteContent {
  about: AboutContent
  music: MusicContent
  projects: ProjectsContent
  videos: VideosContent
  socials: SocialsContent
}
