import type { NavSection } from '../types/content'

const pageIds: NavSection[] = ['home', 'music', 'projects', 'video', 'about']

export function routeFromHash(hash: string): { page: NavSection; opensContact: boolean } {
  const value = hash.replace(/^#\/?/, '')
  const legacyPageMap: Record<string, NavSection> = {
    work: 'music',
    music: 'music',
    projects: 'projects',
    video: 'video',
    contact: 'about',
  }
  const page = legacyPageMap[value] ?? value

  return {
    page: pageIds.includes(page as NavSection) ? page as NavSection : 'home',
    opensContact: value === 'contact',
  }
}
