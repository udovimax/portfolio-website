/**
 * Purpose: Compose the portfolio pages and coordinate global interactive state.
 *
 * Responsibilities:
 * - Resolve the hash-based page state and render page-specific content.
 * - Load JSON content, own Howler playback/analyser state, and pass callbacks to controls.
 * - Mount the navigation, contact drawer, player, scroll guide, and lazy media modals.
 *
 * Constraints: Keep routine copy/media in public/content JSON. Player owns presentation only;
 * audio creation and analyser wiring remain here so playback persists across page changes.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Howl, Howler } from 'howler'
import { FaBandcamp, FaEnvelope, FaInstagram, FaLinkedin, FaPaypal, FaSoundcloud, FaSpotify } from 'react-icons/fa'
import { SiBandlab } from 'react-icons/si'
import { Carousel } from './components/Carousel'
import { ContactDrawer } from './components/ContactDrawer'
import { FloatingNav } from './components/FloatingNav'
import { InstagramEmbed } from './components/InstagramEmbed'
import { LazyBackgroundVideo } from './components/LazyBackgroundVideo'
import { MediaArchive } from './components/MediaArchive'
import { Player } from './components/Player'
import { useLenis } from './hooks/useLenis'
import { assetUrl, useSiteContent } from './hooks/useSiteContent'
import type { NavSection, ProjectItem, Track, VideoItem } from './types/content'

const pageIds: NavSection[] = ['home', 'music', 'projects', 'video', 'about']

const VideoModal = lazy(() =>
  import('./components/MediaModals').then((module) => ({ default: module.VideoModal })),
)
const ProjectModal = lazy(() =>
  import('./components/MediaModals').then((module) => ({ default: module.ProjectModal })),
)

function getPageFromHash(): NavSection {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const legacyPageMap: Record<string, NavSection> = {
    work: 'music',
    music: 'music',
    projects: 'projects',
    video: 'video',
    contact: 'about',
  }
  const page = legacyPageMap[hash] ?? hash
  return pageIds.includes(page as NavSection) ? (page as NavSection) : 'home'
}

const heroImageCycle = [
  { src: 'media/images/max/photo-6.jpg', alt: 'Max Udovichenko in a mirror', position: 'center 38%' },
  { src: 'media/images/max/photo-2.jpg', alt: 'Max Udovichenko reaching toward the camera', position: 'center 45%' },
  { src: 'media/images/instagram/film-1.jpg', alt: 'Max Udovichenko beside a red telephone box', position: 'center 42%' },
  { src: 'media/images/instagram/film-40.jpg', alt: 'A warm portrait of Max Udovichenko', position: 'center 34%' },
  { src: 'media/images/film/000006630015.jpg', alt: '35mm mountain landscape at dusk', position: 'center 48%' },
  { src: 'media/images/film/000006630009.jpg', alt: '35mm mountain range in mist', position: 'center 46%' },
  { src: 'media/images/film/000006630020.jpg', alt: 'Graffiti-lined city street on film', position: 'center 48%' },
  { src: 'media/images/film/CNV000032.jpg', alt: '35mm clouds against a blue sky', position: 'center 50%' },
]

const skillBackgrounds = [
  'media/images/film/000006630020.jpg',
  'media/images/film/000006630015.jpg',
  'media/images/max/photo-1.jpg',
  'media/images/max/photo-4.jpg',
  'media/images/max/photo-6.jpg',
  'media/images/film/000028740011.jpg',
  'media/images/instagram/film-25.webp',
  'media/images/film/000028740004.jpg',
  'media/images/instagram/film-31.jpg',
  'media/images/film/000006630007.jpg',
  'media/images/instagram/film-40.jpg',
]

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  amount?: number
  y?: number
}

function Reveal({ children, className = '', delay = 0, amount = 0.2, y = 24 }: RevealProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function WordReveal({ text }: { text: string }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.h1
      className="hero-title text-balance text-6xl font-bold leading-[0.9] sm:text-8xl md:text-9xl"
      aria-label={text}
    >
      {text.split(' ').map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom pr-[0.2em]">
          <motion.span
            className="inline-block"
            initial={shouldReduceMotion ? false : { opacity: 0, y: '110%' }}
            animate={{ opacity: 1, y: '0%' }}
            transition={{ duration: 0.8, delay: 0.28 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  )
}

function PageTitle({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.h2
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.h2>
  )
}

function HeroImageBand() {
  const shouldReduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (shouldReduceMotion) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % heroImageCycle.length)
    }, 8000)

    return () => window.clearInterval(timer)
  }, [shouldReduceMotion])

  return (
    <figure className="hero-image-band" aria-hidden="true">
      {heroImageCycle.map((image, index) => (
        <img
          key={image.src}
          src={assetUrl(image.src)}
          alt=""
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={index === activeIndex ? 'is-active' : ''}
          style={{ objectPosition: image.position }}
        />
      ))}
      <div className="hero-image-band-scrim" />
    </figure>
  )
}

const nextPage: Record<NavSection, NavSection> = {
  home: 'music',
  music: 'projects',
  projects: 'video',
  video: 'about',
  about: 'home',
}

async function playHowlWhenReady(howl: Howl) {
  if (Howler.ctx?.state === 'suspended') {
    await Howler.ctx.resume()
  }

  if (howl.state() === 'unloaded') {
    howl.load()
  }

  if (howl.state() === 'loaded') {
    if (!howl.playing()) {
      howl.play()
    }
    return
  }

  if (howl.state() === 'loading') {
    howl.once('load', () => {
      if (!howl.playing()) {
        howl.play()
      }
    })
  }
}

function ScrollGuide({ currentPage }: { currentPage: NavSection }) {
  const shouldReduceMotion = useReducedMotion()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [atPageEnd, setAtPageEnd] = useState(false)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
      const currentScroll = window.scrollY
      setScrollProgress(maxScroll ? Math.min(currentScroll / maxScroll, 1) : 0)
      setAtPageEnd(maxScroll > 0 && currentScroll >= maxScroll - 24)
    }

    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [currentPage])

  const handleAdvance = () => {
    if (atPageEnd) {
      window.location.hash = nextPage[currentPage]
      return
    }

    window.scrollTo({
      top: Math.min(window.scrollY + window.innerHeight * 0.78, document.documentElement.scrollHeight),
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    })
  }

  const guideLabel = atPageEnd
    ? `Next / ${nextPage[currentPage]}`
    : currentPage === 'home'
      ? 'Continue / explore'
      : currentPage === 'about'
        ? 'Continue / story'
        : `Continue / ${currentPage}`
  const destinationLabel = atPageEnd
    ? `Open ${nextPage[currentPage]} page`
    : `Continue through ${currentPage === 'home' ? 'the introduction' : currentPage === 'about' ? 'the story' : currentPage}`

  return (
    <aside className={`scroll-guide scroll-guide-${currentPage}`} aria-label="Page scroll guide">
      <span className="scroll-guide-label" aria-live="polite">
        {guideLabel}
      </span>
      <button type="button" className="scroll-guide-button" onClick={handleAdvance} aria-label={destinationLabel}>
        <span className="scroll-guide-track" aria-hidden="true">
          <span className="scroll-guide-progress" style={{ transform: `scaleY(${Math.max(scrollProgress, 0.08)})` }} />
        </span>
        <span className="scroll-guide-arrow" aria-hidden="true">
          <span />
        </span>
      </button>
    </aside>
  )
}

function App() {
  const shouldReduceMotion = useReducedMotion()
  useLenis(!shouldReduceMotion)

  const { content, error, isLoading } = useSiteContent()

  const [loadingProgress, setLoadingProgress] = useState(0)
  const [currentPage, setCurrentPage] = useState<NavSection>(() => getPageFromHash())
  const [libraryMode, setLibraryMode] = useState<'local' | 'soundcloud'>('local')
  const [visualizerData, setVisualizerData] = useState<number[]>(
    Array.from({ length: 32 }, () => 0.2),
  )

  const [trackIndex, setTrackIndex] = useState(0)
  const [musicSlideIndex, setMusicSlideIndex] = useState(0)
  const [projectSlideIndex, setProjectSlideIndex] = useState(0)
  const [videoSlideIndex, setVideoSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.75)
  const [audioError, setAudioError] = useState<string | null>(null)

  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null)
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [videoResumePoints, setVideoResumePoints] = useState<Record<string, number>>({})

  const howlRef = useRef<Howl | null>(null)
  const initialVolumeRef = useRef(volume)
  const shouldAutoplayRef = useRef(isPlaying)
  const isPlayingRef = useRef(isPlaying)

  const tracks = content?.music.tracks ?? []
  const activeTrack: Track | null = tracks[trackIndex] ?? null

  const handleMusicSlideChange = useCallback((index: number) => setMusicSlideIndex(index), [])
  const handleProjectSlideChange = useCallback((index: number) => setProjectSlideIndex(index), [])
  const handleVideoSlideChange = useCallback((index: number) => setVideoSlideIndex(index), [])

  const workBackground = currentPage === 'music'
    ? libraryMode === 'local'
      ? tracks[musicSlideIndex]?.artwork
      : assetUrl('media/images/max/photo-2.jpg')
    : currentPage === 'projects'
      ? content?.projects.projects[projectSlideIndex]?.thumbnail
      : currentPage === 'video'
        ? content?.archive.videos[videoSlideIndex]?.poster
        : undefined

  useEffect(() => {
    initialVolumeRef.current = volume
  }, [volume])

  useEffect(() => {
    shouldAutoplayRef.current = isPlaying
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    if (!isLoading) {
      setLoadingProgress(100)
      return
    }

    const timer = window.setInterval(() => {
      setLoadingProgress((previous) => Math.min(previous + 4, 92))
    }, 60)

    return () => {
      window.clearInterval(timer)
    }
  }, [isLoading])

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(getPageFromHash())
      if (window.location.hash.replace(/^#\/?/, '') === 'contact') {
        window.requestAnimationFrame(() => {
          document.getElementById('contact')?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
        })
      }
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [shouldReduceMotion])

  useEffect(() => {
    if (window.location.hash.replace(/^#\/?/, '') === 'contact') {
      window.requestAnimationFrame(() => {
        document.getElementById('contact')?.scrollIntoView({ behavior: 'auto' })
      })
      return
    }

    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [currentPage, shouldReduceMotion])

  useEffect(() => {
    if (!activeTrack) {
      return
    }

    howlRef.current?.unload()
    setCurrentTime(0)
    setAudioError(null)
    const [minutes, seconds] = activeTrack.duration.split(':').map(Number)
    setDuration((minutes || 0) * 60 + (seconds || 0))

    const howl = new Howl({
      src: [activeTrack.src],
      // Keep the track in Web Audio so the analyser receives the same signal
      // that reaches the speakers. HTML5 audio bypasses Howler's audio graph.
      html5: false,
      pool: 1,
      volume: initialVolumeRef.current,
      preload: false,
      onplay: () => {
        setAudioError(null)
        setIsPlaying(true)
      },
      onpause: () => {
        setIsPlaying(false)
      },
      onstop: () => {
        setIsPlaying(false)
      },
      onloaderror: () => {
        setIsPlaying(false)
        setAudioError('This track could not be loaded. Try play again.')
      },
      onplayerror: () => {
        setIsPlaying(false)
        setAudioError('Audio is waiting for a user gesture. Try play again.')
      },
      onload: () => {
        setAudioError(null)
        setDuration(howl.duration())
      },
      onend: () => {
        shouldAutoplayRef.current = true
        setIsPlaying(true)
        setTrackIndex((previous) => {
          if (!tracks.length) {
            return previous
          }
          return (previous + 1) % tracks.length
        })
      },
    })

    howlRef.current = howl
    if (shouldAutoplayRef.current) {
      void playHowlWhenReady(howl)
    }

    return () => {
      howl.unload()
    }
  }, [activeTrack, tracks.length])

  useEffect(() => {
    howlRef.current?.volume(volume)
  }, [volume])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const howl = howlRef.current
      if (!howl) {
        return
      }

      if (howl.playing()) {
        setCurrentTime(howl.seek() as number)
      }
    }, 200)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const ctx = Howler.ctx
    const gainNode = Howler.masterGain

    if (!ctx || !gainNode) {
      const interval = window.setInterval(() => {
        setVisualizerData((previous) =>
          previous.map(() => 0.12 + Math.random() * (isPlayingRef.current ? 0.55 : 0.12)),
        )
      }, 140)
      return () => {
        window.clearInterval(interval)
      }
    }

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.78
    const data = new Uint8Array(analyser.frequencyBinCount)
    gainNode.connect(analyser)

    let frame = 0
    let lastUpdate = 0
    const animate = (timestamp: number) => {
      analyser.getByteFrequencyData(data)
      if (timestamp - lastUpdate > 45) {
        setVisualizerData((previous) =>
          previous.map((value, index) => {
            const start = Math.floor((index / previous.length) * data.length)
            const end = Math.max(start + 1, Math.floor(((index + 1) / previous.length) * data.length))
            let total = 0
            for (let bucket = start; bucket < end; bucket += 1) {
              total += data[bucket] ?? 0
            }
            const average = total / (end - start) / 255
            return value * 0.72 + Math.max(0.018, average) * 0.28
          }),
        )
        lastUpdate = timestamp
      }
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      analyser.disconnect()
    }
  }, [content])

  const togglePlay = () => {
    const howl = howlRef.current
    if (!howl) {
      return
    }
    if (howl.playing()) {
      howl.pause()
      return
    }
    void playHowlWhenReady(howl)
  }

  const selectTrack = (index: number) => {
    if (!tracks.length) {
      return
    }

    shouldAutoplayRef.current = true

    if (index === trackIndex) {
      if (howlRef.current) {
        void playHowlWhenReady(howlRef.current)
      }
      return
    }

    setIsPlaying(true)
    setTrackIndex(index)
  }

  const playSpecificTrack = (index: number) => {
    selectTrack(index)
  }

  const goPrevious = () => {
    if (!tracks.length) {
      return
    }
    selectTrack((trackIndex - 1 + tracks.length) % tracks.length)
  }

  const goNext = () => {
    if (!tracks.length) {
      return
    }
    selectTrack((trackIndex + 1) % tracks.length)
  }

  const seekTo = (time: number) => {
    const howl = howlRef.current
    if (!howl) {
      return
    }
    howl.seek(time)
    setCurrentTime(time)
  }

  const socialLinks = useMemo(() => {
    if (!content) {
      return []
    }

    return [
      {
        id: 'spotify',
        href: content.socials.spotify,
        label: 'Spotify',
        icon: <FaSpotify aria-hidden="true" />,
      },
      {
        id: 'instagram',
        href: content.socials.instagram,
        label: 'Instagram',
        icon: <FaInstagram aria-hidden="true" />,
      },
      {
        id: 'linkedin',
        href: content.socials.linkedin,
        label: 'LinkedIn',
        icon: <FaLinkedin aria-hidden="true" />,
      },
      {
        id: 'bandlab',
        href: content.socials.bandlab,
        label: 'BandLab',
        icon: <SiBandlab aria-hidden="true" />,
      },
      {
        id: 'paypal',
        href: content.socials.paypal,
        label: 'Support Max on PayPal',
        icon: <FaPaypal aria-hidden="true" />,
      },
      {
        id: 'soundcloud',
        href: content.socials.soundcloud,
        label: 'SoundCloud',
        icon: <FaSoundcloud aria-hidden="true" />,
      },
      {
        id: 'bandcamp',
        href: content.socials.bandcamp,
        label: 'Bandcamp',
        icon: <FaBandcamp aria-hidden="true" />,
      },
    ]
  }, [content])

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-white">
        <p className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6">
          Unable to load content: {error}
        </p>
      </main>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            className="fixed inset-0 z-[90] grid place-items-center bg-neutral-950"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-6 text-center">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs uppercase tracking-[0.4em] text-white/70"
              >
                Max Udovichenko
              </motion.p>
              <h1 className="text-4xl font-semibold text-white sm:text-6xl">Loading Experience</h1>
              <div className="mx-auto h-1 w-72 overflow-hidden rounded-full bg-white/20">
                <motion.span
                  className="block h-full bg-cyan-300"
                  animate={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <FloatingNav
        activePage={currentPage}
        contactOpen={contactOpen}
        onContactOpenChange={setContactOpen}
      />
      <ScrollGuide currentPage={currentPage} />

      <main className={`relative text-white ${currentPage === 'home' ? 'home-page-main' : ''}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`site-page page-${currentPage}`}
          >
        {currentPage === 'home' ? (
          <section id="home" className="hero-section section-shell pt-28">
          <WordReveal text={content?.about.name ?? ''} />
          {content?.about.cv ? (
            <div className="home-cv-inline" aria-label="Download CV versions">
              <a className="home-cv-text-link magnetic-btn" href={assetUrl(content.about.cv.professional)} download>
                Professional CV
              </a>
              <a className="home-cv-text-link magnetic-btn" href={assetUrl(content.about.cv.ats)} download>
                ATS CV
              </a>
            </div>
          ) : null}
          <div className="hero-intro-grid mt-14">
            <div className="hero-copy">
              <div className="hero-role-stack space-y-3 text-2xl text-white/75 sm:text-4xl">
                {content?.about.roles.map((role, index) => (
                  <motion.p
                    key={role}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ delay: index * 0.14, duration: 0.5 }}
                  >
                    {role}.
                  </motion.p>
                ))}
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.62 }}
                className="mt-10 max-w-3xl text-lg text-white/70"
              >
                {content?.about.intro}
              </motion.p>
              <motion.a
                href="#about"
                className="hero-more-link magnetic-btn"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
              >
                More
              </motion.a>
            </div>
          </div>
          <Reveal className="mt-10" delay={0.12}>
            <HeroImageBand />
          </Reveal>
          {content?.archive?.videos[1] ? (
            <Reveal className="mt-10" delay={0.16}>
              <div className="home-ambient-panel home-journey-panel">
                <div className="home-journey-actions">
                  <a href="#music" className="home-journey-link home-journey-link-primary magnetic-btn">
                    <LazyBackgroundVideo
                      src={content.archive.videos[0]?.loop ?? content.archive.videos[1].loop}
                      poster={content.archive.videos[0]?.poster ?? content.archive.videos[1].poster}
                      className="home-journey-video"
                    />
                    <div className="home-journey-scrim" aria-hidden="true" />
                    <motion.span
                      className="home-journey-copy"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="section-heading">Music / 01</span>
                      <strong>Listen to the work</strong>
                    </motion.span>
                  </a>
                  <a href="#projects" className="home-journey-link magnetic-btn">
                    <LazyBackgroundVideo
                      src={content.archive.videos[1].loop}
                      poster={content.archive.videos[1].poster}
                      className="home-journey-video"
                    />
                    <div className="home-journey-scrim" aria-hidden="true" />
                    <motion.span
                      className="home-journey-copy"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="section-heading">Projects / 02</span>
                      <strong>Explore curated projects</strong>
                    </motion.span>
                  </a>
                  <a href="#video" className="home-journey-link magnetic-btn">
                    <LazyBackgroundVideo
                      src={content.archive.videos[2]?.loop ?? content.archive.videos[0]?.loop ?? content.archive.videos[1].loop}
                      poster={content.archive.videos[2]?.poster ?? content.archive.videos[0]?.poster ?? content.archive.videos[1].poster}
                      className="home-journey-video"
                    />
                    <div className="home-journey-scrim" aria-hidden="true" />
                    <motion.span
                      className="home-journey-copy"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="section-heading">Video / 03</span>
                      <strong>Watch the films</strong>
                    </motion.span>
                  </a>
                </div>
              </div>
            </Reveal>
          ) : null}
          </section>
        ) : null}

        {currentPage === 'music' || currentPage === 'projects' || currentPage === 'video' ? (
          <section id={currentPage} className="work-section section-shell work-page-section">
          <div className={`work-page-stage ${currentPage === 'music' ? 'work-page-stage-music' : ''}`}>
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={workBackground ?? currentPage}
              className="work-page-background"
              aria-hidden="true"
              style={
                {
                  backgroundImage: workBackground
                    ? `linear-gradient(90deg, rgba(5, 8, 13, 0.84), rgba(5, 8, 13, 0.38) 48%, rgba(5, 8, 13, 0.7)), url("${workBackground}")`
                    : undefined,
                } as CSSProperties
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: 'easeInOut' }}
            />
          </AnimatePresence>
          <div className="work-page-content">
          {currentPage === 'music' ? (
            <div className="work-page-panel">
              <Reveal className="work-page-heading" delay={0.05}>
                <h1>Music</h1>
              </Reveal>

          <Reveal className="mb-8 flex justify-end" delay={0.08}>
            <div className="inline-flex rounded-full border border-white/20 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setLibraryMode('local')}
                className={`magnetic-btn rounded-full px-4 py-2 text-sm ${
                  libraryMode === 'local' ? 'bg-white text-black' : 'text-white/75'
                }`}
              >
                Local Library
              </button>
              <button
                type="button"
                onClick={() => setLibraryMode('soundcloud')}
                className={`magnetic-btn rounded-full px-4 py-2 text-sm ${
                  libraryMode === 'soundcloud' ? 'bg-white text-black' : 'text-white/75'
                }`}
              >
                SoundCloud Playlist
              </button>
            </div>
          </Reveal>

          {libraryMode === 'local' ? (
            <Carousel
              label="Music"
              count={tracks.length}
              className="work-carousel work-immersive-carousel"
              onActiveIndexChange={handleMusicSlideChange}
              showSwipeHint
            >
              {tracks.map((track, index) => (
                <div className="carousel-item work-full-bleed-slide" key={track.id}>
                  <article className="work-full-bleed-copy">
                    <p className="section-heading">{track.year}</p>
                    <div>
                      <h2>{track.title}</h2>
                      <p>{track.description}</p>
                    </div>
                    <div className="work-full-bleed-meta">
                      <span>{track.duration}</span>
                      <span>{track.credits}</span>
                    </div>
                    <button
                      type="button"
                      className="magnetic-btn work-full-bleed-action"
                      onClick={() => playSpecificTrack(index)}
                      aria-label={`Play ${track.title}`}
                    >
                      Play track
                    </button>
                  </article>
                </div>
              ))}
            </Carousel>
          ) : (
            <div className="work-soundcloud-panel">
              <h2>{content?.music.soundcloud.title}</h2>
              <div className="rounded-2xl border border-white/15 bg-black/40 p-2">
                <iframe
                  title="Max Udovichenko SoundCloud Playlist"
                  src={content?.music.soundcloud.embedUrl}
                  loading="lazy"
                  width="100%"
                  height="420"
                  allow="autoplay; encrypted-media"
                  className="rounded-xl"
                />
              </div>
            </div>
          )}

            </div>
          ) : null}

          {currentPage === 'projects' ? (
            <div className="work-page-panel">
              <Reveal className="work-page-heading" delay={0.05}>
                <h1>Projects</h1>
              </Reveal>
          <Reveal delay={0.1}>
            <Carousel
              label="Projects"
              count={content?.projects.projects.length ?? 0}
              className="work-carousel work-immersive-carousel"
              onActiveIndexChange={handleProjectSlideChange}
              showSwipeHint
            >
              {content?.projects.projects.map((project) => {
                const linkedVideo = content.videos.videos.find((video) => video.id === project.videoId)
                return (
                  <div className="carousel-item work-full-bleed-slide" key={project.id}>
                    <article className="work-full-bleed-copy">
                      <p className="section-heading">{project.type} / {project.year}</p>
                      <div>
                        <button
                          type="button"
                          className="work-full-bleed-title"
                          onClick={() => setActiveProject(project)}
                        >
                          {project.title}
                        </button>
                        <p>{project.description}</p>
                      </div>
                      {linkedVideo ? (
                        <button
                          type="button"
                          className="magnetic-btn work-full-bleed-action"
                          onClick={() => setActiveVideo(linkedVideo)}
                        >
                          Watch cinematic video
                        </button>
                      ) : null}
                    </article>
                  </div>
                )
              })}
            </Carousel>
          </Reveal>
            </div>
          ) : null}

          {currentPage === 'video' ? (
            <div className="work-page-panel">
              <Reveal className="work-page-heading" delay={0.05}>
                <h1>Video</h1>
              </Reveal>
          {content?.archive ? (
            <Reveal delay={0.12}>
            <MediaArchive
              archive={content.archive}
              onOpenVideo={setActiveVideo}
              onActiveIndexChange={handleVideoSlideChange}
              immersive
            />
            </Reveal>
          ) : null}
            </div>
          ) : null}
          </div>
          </div>
          {currentPage === 'music' && content?.music.worksInProgress?.length ? (
            <div className="work-page-followup">
              <Reveal className="music-wip-section" delay={0.14}>
                <div className="music-wip-heading">
                  <p className="section-heading">Works in progress</p>
                  <p>New material in development.</p>
                </div>
                <div className="music-wip-list">
                  {content.music.worksInProgress.map((item) => (
                    <article className="music-wip-card" key={item.id}>
                      <p className="section-heading">{item.kicker}</p>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <span>{item.status}</span>
                    </article>
                  ))}
                </div>
              </Reveal>
            </div>
          ) : null}
        </section>
        ) : null}

        {currentPage === 'about' ? (
          <section id="about" className="about-section section-shell">
          <Reveal delay={0.1}>
            <div className="max-w-4xl">
              <div>
                <PageTitle className="text-4xl font-semibold sm:text-6xl" delay={0.14}>
                  Artistic Philosophy
                </PageTitle>
                <p className="mt-4 max-w-3xl text-lg text-white/75">{content?.about.philosophy}</p>
                {content?.about.skills.length ? (
                  <Carousel
                    label="Skills"
                    count={content.about.skills.length}
                    countLabel="skills"
                    className="skills-carousel mt-8"
                    showSwipeHint
                    autoAdvanceMs={4200}
                  >
                    {content.about.skills.map((skill, index) => (
                      <div
                        className="carousel-item skills-carousel-item"
                        key={skill}
                        style={
                          {
                            '--skill-art': `url("${assetUrl(skillBackgrounds[index % skillBackgrounds.length])}")`,
                          } as CSSProperties
                        }
                      >
                        <article className="skills-carousel-slide">
                          <span className="skills-carousel-index" aria-hidden="true">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h2>{skill}</h2>
                        </article>
                      </div>
                    ))}
                  </Carousel>
                ) : null}
                {content?.about.cv ? (
                  <div className="about-cv-links" aria-label="Download CV versions">
                    <a
                      className="about-cv-text-link magnetic-btn"
                      href={assetUrl(content.about.cv.professional)}
                      download
                    >
                      Professional CV
                    </a>
                    <a
                      className="about-cv-text-link magnetic-btn"
                      href={assetUrl(content.about.cv.ats)}
                      download
                    >
                      ATS CV
                    </a>
                  </div>
                ) : null}
                {content?.socials.paypal ? (
                  <div className="about-support-link">
                    <span>
                      <span className="section-heading">Support Max</span>
                      <strong>Help fund future music and visual work</strong>
                    </span>
                    <a
                      href={content.socials.paypal}
                      target="_blank"
                      rel="noreferrer"
                      className="about-donate-link magnetic-btn"
                    >
                      Donate via PayPal
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-14" delay={0.14}>
            <details className="experience-accordion" open>
              <summary className="experience-accordion-summary">
                <span>
                  <span className="section-heading">Curated timeline</span>
                  <strong>Experience</strong>
                </span>
                <span className="experience-accordion-toggle" aria-hidden="true" />
              </summary>
              <div className="experience-list">
                {content?.about.timeline.map((item, index) => (
                  <motion.div
                    key={`${item.year}-${item.title}`}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <details
                      className="experience-item"
                      style={
                        {
                          '--experience-accent': item.accent ?? 'var(--accent)',
                          '--experience-art': item.image ? `url("${assetUrl(item.image)}")` : 'none',
                        } as CSSProperties
                      }
                    >
                      <summary>
                        <span className="experience-year">{item.year}</span>
                        <span className="experience-summary-copy">
                          <span className="experience-kicker">{item.kicker ?? 'Experience'}</span>
                          <strong>{item.title}</strong>
                        </span>
                        <span className="experience-item-toggle" aria-hidden="true" />
                      </summary>
                      <div className="experience-item-body">
                        <div>
                          <p>{item.description}</p>
                          <span className="experience-accent-line" aria-hidden="true" />
                        </div>
                        {item.image ? (
                          <figure className="experience-image">
                            <img
                              src={assetUrl(item.image)}
                              alt={`${item.title} — Max Udovichenko`}
                              loading="lazy"
                              decoding="async"
                            />
                          </figure>
                        ) : null}
                      </div>
                    </details>
                  </motion.div>
                ))}
              </div>
            </details>
          </Reveal>

          <Reveal className="mt-16" delay={0.1}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="section-heading">Instagram / @udaaaww</p>
                <h2 className="mt-2 text-3xl font-semibold text-white sm:text-5xl">Behind the sound</h2>
              </div>
              <a
                href={content?.socials.instagram}
                target="_blank"
                rel="noreferrer"
                className="magnetic-btn rounded-full border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/80 hover:border-white/50 hover:text-white"
              >
                View profile + highlights
              </a>
            </div>
            {content?.socials.instagramPosts?.length ? (
              <Carousel
                label="Instagram posts"
                count={content.socials.instagramPosts.length}
                countLabel="posts"
                className="instagram-posts-carousel"
              >
                {content.socials.instagramPosts.map((permalink) => (
                  <div className="carousel-item" key={permalink}>
                    <InstagramEmbed permalink={permalink} label={`Instagram post ${permalink}`} />
                  </div>
                ))}
              </Carousel>
            ) : (
              <InstagramEmbed
                permalink={content?.socials.instagram ?? 'https://www.instagram.com/udaaaww/'}
                label="Max Udovichenko Instagram profile"
              />
            )}
          </Reveal>
          </section>
        ) : null}

          </motion.div>
        </AnimatePresence>
      </main>

      {content?.socials ? (
        <ContactDrawer
          isOpen={contactOpen}
          endpointEmail={content.socials.formsubmit.endpointEmail}
          subject={content.socials.formsubmit.subject}
          paypal={content.socials.paypal}
          paypalQr={content.socials.paypalQr ? assetUrl(content.socials.paypalQr) : undefined}
          onClose={() => setContactOpen(false)}
        />
      ) : null}

      <motion.footer
        initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="footer-site border-t border-white/10 px-4 py-5 text-center sm:px-6 sm:py-6"
      >
        <div className="footer-topline">
          <p className="footer-brand text-2xl font-semibold text-white sm:text-4xl">MAX UDOVICHENKO</p>
          <nav className="footer-journeys" aria-label="Explore Max Udovichenko">
            <a href="#music" className="footer-text-link magnetic-btn">Music</a>
            <a href="#projects" className="footer-text-link magnetic-btn">Projects</a>
            <a href="#video" className="footer-text-link magnetic-btn">Video</a>
            <a href="#about" className="footer-text-link magnetic-btn">Get to know me</a>
          </nav>
        </div>
        {content?.socials ? (
          <div className="footer-connect">
            <a className="footer-email magnetic-btn" href={`mailto:${content.socials.email}`}>
              <FaEnvelope aria-hidden="true" />
              <span>{content.socials.email}</span>
            </a>
            <nav className="footer-socials" aria-label="Max Udovichenko social profiles">
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-social-link magnetic-btn"
                  aria-label={social.label}
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </nav>
            <a
              className="footer-donate-link magnetic-btn"
              href={content.socials.paypal}
              target="_blank"
              rel="noreferrer"
            >
              <FaPaypal aria-hidden="true" />
              <span>Donate via PayPal</span>
            </a>
          </div>
        ) : null}
        <p className="footer-copyright">
          Copyright {new Date().getFullYear()} Max Udovichenko
        </p>
      </motion.footer>

      <Player
        track={activeTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        audioError={audioError}
        visualizerData={visualizerData}
        onTogglePlay={togglePlay}
        onPrevious={goPrevious}
        onNext={goNext}
        onSeek={seekTo}
        onVolumeChange={setVolume}
      />

      {activeVideo ? (
        <Suspense fallback={null}>
          <VideoModal
            video={activeVideo}
            isOpen
            onClose={() => setActiveVideo(null)}
            onTimeUpdate={(id, value) => {
              setVideoResumePoints((previous) => ({ ...previous, [id]: value }))
            }}
            resumeTime={videoResumePoints[activeVideo.id]}
          />
        </Suspense>
      ) : null}

      {activeProject ? (
        <Suspense fallback={null}>
          <ProjectModal
            project={activeProject}
            isOpen
            onClose={() => setActiveProject(null)}
          />
        </Suspense>
      ) : null}
    </>
  )
}

export default App
