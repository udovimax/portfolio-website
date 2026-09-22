import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Carousel } from './Carousel'
import { assetUrl } from '../hooks/useSiteContent'
import {
  MOBILE_FUNNEL_SCREEN_LABELS,
  MOBILE_ROUTE_OPTIONS,
  mobileRouteAction,
  type MobileRoute,
} from '../utils/mobileFunnel'

interface MobileLandingFunnelProps {
  name: string
  roles: string[]
  intro: string
  heroImages: readonly MobileFunnelHeroImage[]
  supportHref: string
  onOpenContact: () => void
  onNavigate: (hash: '#music' | '#about') => void
}

interface MobileFunnelHeroImage {
  src: string
  alt: string
  position: string
}

interface FunnelScreenProps {
  screenRef: (node: HTMLElement | null) => void
  children: ReactNode
}

function FunnelScreen({ screenRef, children }: FunnelScreenProps) {
  return (
    <section ref={screenRef} className="mobile-funnel-screen carousel-item">
      {children}
    </section>
  )
}

function FunnelActions({ supportHref, onOpenContact }: Pick<MobileLandingFunnelProps, 'supportHref' | 'onOpenContact'>) {
  return (
    <div className="mobile-funnel-actions">
      <button type="button" className="mobile-funnel-contact magnetic-btn" onClick={onOpenContact}>
        Contact Max
      </button>
      <a className="mobile-funnel-support magnetic-btn" href={supportHref} target="_blank" rel="noreferrer">
        Support Max
      </a>
    </div>
  )
}

function RouteButton({
  action,
  title,
  label,
  description,
  artwork,
  onOpenContact,
  onNavigate,
}: {
  action: MobileRoute
  title: string
  label: string
  description: string
  artwork: string
  onOpenContact: () => void
  onNavigate: (hash: '#music' | '#about') => void
}) {
  const handleClick = () => {
    const destination = mobileRouteAction(action)
    if (destination.kind === 'contact') {
      onOpenContact()
      return
    }

    onNavigate(destination.value)
  }

  return (
    <button
      type="button"
      className={`mobile-funnel-route mobile-funnel-route-${action} magnetic-btn`}
      style={{ '--funnel-art': `url("${assetUrl(artwork)}")` } as CSSProperties}
      onClick={handleClick}
    >
      <span className="section-heading">{label}</span>
      <strong>{title}</strong>
      <span>{description}</span>
      <span className="mobile-funnel-route-arrow" aria-hidden="true">↗</span>
    </button>
  )
}

export function MobileLandingFunnel({
  name,
  roles,
  intro,
  heroImages,
  supportHref,
  onOpenContact,
  onNavigate,
}: MobileLandingFunnelProps) {
  const shouldReduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeHeroImage, setActiveHeroImage] = useState(0)
  const screenRefs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    if (shouldReduceMotion || heroImages.length < 2) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveHeroImage((previous) => (previous + 1) % heroImages.length)
    }, 8000)

    return () => window.clearInterval(timer)
  }, [heroImages.length, shouldReduceMotion])

  useEffect(() => {
    screenRefs.current.forEach((screen, index) => {
      if (!screen) return
      const inactive = index !== activeIndex
      screen.setAttribute('aria-hidden', String(inactive))
      screen.inert = inactive
    })
  }, [activeIndex])

  const screenRef = (index: number) => (node: HTMLElement | null) => {
    screenRefs.current[index] = node
    if (node) {
      const inactive = index !== activeIndex
      node.setAttribute('aria-hidden', String(inactive))
      node.inert = inactive
    }
  }

  return (
    <section className="mobile-funnel-shell" aria-label="Mobile portfolio introduction">
      <Carousel
        label="Mobile portfolio introduction"
        count={MOBILE_FUNNEL_SCREEN_LABELS.length}
        className="mobile-funnel-carousel"
        showSwipeHint
        showProgress
        onActiveIndexChange={setActiveIndex}
      >
        <FunnelScreen screenRef={screenRef(0)}>
          <div className="mobile-funnel-screen-content mobile-funnel-intro-content">
            <div className="mobile-funnel-hero-art" aria-hidden="true">
              {heroImages.map((image, index) => (
                <img
                  key={image.src}
                  src={assetUrl(image.src)}
                  alt=""
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={index === activeHeroImage ? 'is-active' : ''}
                  style={{ objectPosition: image.position }}
                />
              ))}
              <div className="mobile-funnel-hero-art-scrim" />
            </div>
            <p className="section-heading">{MOBILE_FUNNEL_SCREEN_LABELS[0]}</p>
            <h1 className="mobile-funnel-name">{name}</h1>
            <div className="mobile-funnel-role-list" aria-label="Max's roles">
              {roles.map((role) => <span key={role}>{role}.</span>)}
            </div>
            <p className="mobile-funnel-intro-copy">{intro}</p>
            <motion.button
              type="button"
              className="mobile-funnel-primary magnetic-btn"
              onClick={onOpenContact}
              whileTap={{ scale: 0.98 }}
            >
              Work with Max
            </motion.button>
            <p className="mobile-funnel-swipe-copy">Swipe to explore the work</p>
          </div>
          <FunnelActions supportHref={supportHref} onOpenContact={onOpenContact} />
        </FunnelScreen>

        <FunnelScreen screenRef={screenRef(1)}>
          <div className="mobile-funnel-screen-content mobile-funnel-routes-content">
            <p className="section-heading">{MOBILE_FUNNEL_SCREEN_LABELS[1]}</p>
            <h2>What brings you here?</h2>
            <p className="mobile-funnel-route-intro">Choose a route into Max’s work, whether you want to book, listen, or explore the practice.</p>
            <div className="mobile-funnel-route-list">
              {MOBILE_ROUTE_OPTIONS.map((option) => (
                <RouteButton key={option.action} {...option} onOpenContact={onOpenContact} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
          <FunnelActions supportHref={supportHref} onOpenContact={onOpenContact} />
        </FunnelScreen>
      </Carousel>
    </section>
  )
}
