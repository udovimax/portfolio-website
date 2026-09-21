export const MOBILE_PHONE_MEDIA_QUERY = '(max-width: 760px)'

export const MOBILE_FUNNEL_STEPS = ['intro', 'routes'] as const
export type MobileFunnelStep = typeof MOBILE_FUNNEL_STEPS[number]

export const MOBILE_ENQUIRY_STEPS = ['intent', 'details', 'identity', 'review', 'success'] as const
export type MobileEnquiryStep = typeof MOBILE_ENQUIRY_STEPS[number]

export type MobileRoute = 'work' | 'hear' | 'explore'
export type MobileRouteAction =
  | { kind: 'contact'; value: '' }
  | { kind: 'hash'; value: '#music' | '#about' }

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
