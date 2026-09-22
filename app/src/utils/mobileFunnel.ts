export const MOBILE_PHONE_MEDIA_QUERY = '(max-width: 760px)'

export type ContactSurface = 'mobile' | 'desktop'

export function contactSurfaceForPhone(isPhoneLayout: boolean): ContactSurface {
  return isPhoneLayout ? 'mobile' : 'desktop'
}

export const MOBILE_FUNNEL_STEPS = ['intro', 'routes'] as const
export type MobileFunnelStep = typeof MOBILE_FUNNEL_STEPS[number]

export const MOBILE_FUNNEL_SCREEN_LABELS = ['Meet Max', 'Find your way in'] as const

export const MOBILE_ENQUIRY_STEPS = ['intent', 'details', 'identity', 'review', 'success'] as const
export type MobileEnquiryStep = typeof MOBILE_ENQUIRY_STEPS[number]

export type MobileRoute = 'work' | 'hear' | 'explore'
export type MobileRouteAction =
  | { kind: 'contact'; value: '' }
  | { kind: 'hash'; value: '#music' | '#about' }

const MOBILE_FUNNEL_ARTWORK = [
  'media/images/film/000006630015.jpg',
  'media/images/film/000006630009.jpg',
  'media/images/film/000006630020.jpg',
] as const

export const MOBILE_ROUTE_OPTIONS: Array<{
  action: MobileRoute
  label: string
  title: string
  description: string
  artwork: string
}> = [
  {
    action: 'work',
    label: 'Work with Max',
    title: 'Producer, engineer, sound designer',
    description: 'Book a session or discuss a brief.',
    artwork: MOBILE_FUNNEL_ARTWORK[0],
  },
  {
    action: 'hear',
    label: 'Hear Max',
    title: 'Artist and music maker',
    description: 'Listen to original music and spatial work.',
    artwork: MOBILE_FUNNEL_ARTWORK[1],
  },
  {
    action: 'explore',
    label: 'Explore the practice',
    title: 'Researcher and photographer',
    description: 'Find the story, skills, and 35mm work.',
    artwork: MOBILE_FUNNEL_ARTWORK[2],
  },
]

export function clampStepIndex(index: number, count: number) {
  if (count <= 0) {
    return 0
  }

  return Math.min(Math.max(index, 0), count - 1)
}

export function mobileRouteAction(route: MobileRoute): MobileRouteAction {
  if (route === 'work') {
    return { kind: 'contact', value: '' }
  }

  return route === 'hear'
    ? { kind: 'hash', value: '#music' }
    : { kind: 'hash', value: '#about' }
}
