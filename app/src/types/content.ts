export type NavSection = 'home' | 'work' | 'about'

export interface AboutTimelineItem {
  year: string
  title: string
  description: string
  kicker?: string
  image?: string
  accent?: string
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

export interface ArchivePhoto {
  id: string
  src: string
  alt: string
}

export interface ArchiveVideo {
  id: string
  title: string
  description: string
  duration: string
  poster: string
  preview: string
  loop: string
  src: string
}

export interface ArchiveContent {
  photos: ArchivePhoto[]
  videos: ArchiveVideo[]
}

export interface SocialsContent {
  email: string
  spotify: string
  instagram: string
  linkedin: string
  bandlab: string
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
  archive: ArchiveContent
  socials: SocialsContent
}
