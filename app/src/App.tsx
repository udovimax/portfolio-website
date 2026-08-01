import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Howl, Howler } from 'howler'
import { FaEnvelope, FaInstagram, FaLinkedin, FaSoundcloud, FaSpotify } from 'react-icons/fa'
import { SiBandlab } from 'react-icons/si'
import { Carousel } from './components/Carousel'
import { ContactDrawer } from './components/ContactDrawer'
import { FloatingNav } from './components/FloatingNav'
import { GlassCard } from './components/GlassCard'
import { InstagramEmbed } from './components/InstagramEmbed'
import { LazyBackgroundVideo } from './components/LazyBackgroundVideo'
import { MediaArchive } from './components/MediaArchive'
import { Player } from './components/Player'
import { useLenis } from './hooks/useLenis'
import { assetUrl, useSiteContent } from './hooks/useSiteContent'
import type { ArchiveVideo, NavSection, ProjectItem, Track, VideoItem } from './types/content'

const pageIds: NavSection[] = ['home', 'work', 'about']

const VideoModal = lazy(() =>
  import('./components/MediaModals').then((module) => ({ default: module.VideoModal })),
)
const ProjectModal = lazy(() =>
  import('./components/MediaModals').then((module) => ({ default: module.ProjectModal })),
)

function getPageFromHash(): NavSection {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const legacyPageMap: Record<string, NavSection> = {
    music: 'work',
    projects: 'work',
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

function WorkSummaryVideo({ video }: { video?: ArchiveVideo }) {
  if (!video) {
    return null
  }

  return (
    <span className="work-accordion-summary-media" aria-hidden="true">
      <LazyBackgroundVideo
        src={video.loop}
        poster={video.poster}
        className="work-accordion-summary-video"
      />
      <span className="work-accordion-summary-scrim" />
    </span>
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
  home: 'work',
  work: 'about',
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
      : currentPage === 'work'
        ? 'Continue / work'
        : 'Continue / story'
  const destinationLabel = atPageEnd
    ? `Open ${nextPage[currentPage]} page`
    : `Continue through ${currentPage === 'home' ? 'the introduction' : currentPage === 'work' ? 'the selected work' : 'the story'}`

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
        id: 'soundcloud',
        href: content.socials.soundcloud,
        label: 'SoundCloud',
        icon: <FaSoundcloud aria-hidden="true" />,
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
            </div>
          </div>
          <Reveal className="mt-10" delay={0.12}>
            <HeroImageBand />
          </Reveal>
          {content?.archive?.videos[1] ? (
            <Reveal className="mt-10" delay={0.16}>
              <div className="home-ambient-panel home-journey-panel">
                <div className="home-journey-actions">
                  <a href="#work" className="home-journey-link home-journey-link-primary magnetic-btn">
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
                      <span className="section-heading">View my projects</span>
                      <strong>Music / Projects / Video</strong>
                      <span>Explore the work</span>
                    </motion.span>
                  </a>
                  <a href="#about" className="home-journey-link magnetic-btn">
                    <LazyBackgroundVideo
                      src={(content.archive.videos[2] ?? content.archive.videos[1]).loop}
                      poster={(content.archive.videos[2] ?? content.archive.videos[1]).poster}
                      className="home-journey-video"
                    />
                    <div className="home-journey-scrim" aria-hidden="true" />
                    <motion.span
                      className="home-journey-copy"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="section-heading">Get to know me</span>
                      <strong>About / Contact</strong>
                      <span>Read the story and say hello</span>
                    </motion.span>
                  </a>
                </div>
              </div>
            </Reveal>
          ) : null}
          </section>
        ) : null}

        {currentPage === 'work' ? (
          <section id="work" className="work-section section-shell">
          <details className="work-accordion" open>
            <summary className="work-accordion-summary">
              <span className="work-accordion-summary-copy">
                <span className="section-heading">Work / 01</span>
                <strong>Music</strong>
              </span>
              <span className="work-accordion-toggle" aria-hidden="true" />
              <WorkSummaryVideo video={content?.archive?.videos[0]} />
            </summary>
            <div className="work-accordion-body">

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
            <Carousel label="Music" count={tracks.length} className="work-carousel">
              {tracks.map((track, index) => (
                <div className="carousel-item" key={track.id}>
                  <GlassCard image={track.artwork} className="work-card h-full cursor-pointer">
                    <div className="space-y-3">
                      <img
                        src={track.artwork}
                        alt={`${track.title} artwork`}
                        loading="lazy"
                        decoding="async"
                        className="content-image h-40 w-full rounded-2xl object-cover sm:h-44"
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{track.year}</p>
                          <h3 className="text-2xl text-white">{track.title}</h3>
                          <p className="text-white/70">{track.description}</p>
                        </div>
                        <button
                          type="button"
                          className="magnetic-btn shrink-0 rounded-full border border-white/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white"
                          onClick={() => playSpecificTrack(index)}
                          aria-label={`Play ${track.title}`}
                        >
                          Play
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-white/60">
                        <span>{track.duration}</span>
                        <span className="min-w-0 text-right">{track.credits}</span>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              ))}
            </Carousel>
          ) : (
            <GlassCard image={assetUrl('media/images/max/photo-2.jpg')}>
              <h3 className="mb-3 text-xl text-white">{content?.music.soundcloud.title}</h3>
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
            </GlassCard>
          )}
            </div>
          </details>

          <details className="work-accordion">
            <summary className="work-accordion-summary">
              <span className="work-accordion-summary-copy">
                <span className="section-heading">Work / 02</span>
                <strong>Projects</strong>
              </span>
              <span className="work-accordion-toggle" aria-hidden="true" />
              <WorkSummaryVideo video={content?.archive?.videos[1] ?? content?.archive?.videos[0]} />
            </summary>
            <div className="work-accordion-body">
          <Reveal delay={0.1}>
            <Carousel label="Projects" count={content?.projects.projects.length ?? 0} className="work-carousel">
              {content?.projects.projects.map((project) => {
                const linkedVideo = content.videos.videos.find((video) => video.id === project.videoId)
                return (
                  <div className="carousel-item" key={project.id}>
                    <GlassCard image={project.thumbnail} className="work-card card-tilt h-full">
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => setActiveProject(project)}
                      >
                        <img
                          src={project.thumbnail}
                          alt={`${project.title} thumbnail`}
                          loading="lazy"
                          decoding="async"
                          className="content-image mb-3 h-40 w-full rounded-2xl object-cover sm:h-48"
                        />
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                          {project.type} / {project.year}
                        </p>
                        <h3 className="text-2xl text-white sm:text-3xl">{project.title}</h3>
                        <p className="mt-2 text-white/70">{project.description}</p>
                      </button>
                      {linkedVideo ? (
                        <button
                          type="button"
                          className="magnetic-btn mt-4 rounded-full border border-white/30 px-4 py-2 text-sm text-white"
                          onClick={() => setActiveVideo(linkedVideo)}
                        >
                          Watch cinematic video
                        </button>
                      ) : null}
                    </GlassCard>
                  </div>
                )
              })}
            </Carousel>
          </Reveal>
            </div>
          </details>

          <details className="work-accordion">
            <summary className="work-accordion-summary">
              <span className="work-accordion-summary-copy">
                <span className="section-heading">Work / 03</span>
                <strong>Video</strong>
              </span>
              <span className="work-accordion-toggle" aria-hidden="true" />
              <WorkSummaryVideo video={content?.archive?.videos[2] ?? content?.archive?.videos[0]} />
            </summary>
            <div className="work-accordion-body">
          {content?.archive ? (
            <Reveal delay={0.12}>
            <MediaArchive archive={content.archive} onOpenVideo={setActiveVideo} />
            </Reveal>
          ) : null}
            </div>
          </details>
        </section>
        ) : null}

        {currentPage === 'about' ? (
          <section id="about" className="about-section section-shell">
          <Reveal className="section-heading mb-8 inline-flex rounded-full border border-white/20 bg-black/45 px-4 py-2 backdrop-blur-md">
            About
          </Reveal>
          <Reveal delay={0.1}>
            <div className="max-w-4xl">
              <div>
                <PageTitle className="text-4xl font-semibold sm:text-6xl" delay={0.14}>
                  Artistic Philosophy
                </PageTitle>
                <p className="mt-4 max-w-3xl text-lg text-white/75">{content?.about.philosophy}</p>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {content?.about.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/85"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-14" delay={0.14}>
            <details className="experience-accordion" open>
              <summary className="experience-accordion-summary">
                <span>
                  <span className="section-heading">Selected timeline</span>
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
            {content?.socials.instagramHighlight ? (
              <a
                href={content.socials.instagramHighlight}
                target="_blank"
                rel="noreferrer"
                className="instagram-highlight-card magnetic-btn mb-6"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(5, 8, 13, 0.92), rgba(5, 8, 13, 0.5)), url("${assetUrl('media/images/instagram/film-1.jpg')}")`,
                }}
              >
                <span className="section-heading">Music / Instagram highlight</span>
                <strong>Latest music stories</strong>
                <span>Open the music highlight on Instagram</span>
              </a>
            ) : null}
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

        {currentPage === 'about' ? (
          <section id="contact" className="contact-section section-shell pb-12">
          <Reveal className="section-heading mb-8 inline-flex rounded-full border border-white/20 bg-black/45 px-4 py-2 backdrop-blur-md">
            Contact
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-8 lg:grid-cols-2">
              <GlassCard image={assetUrl('media/images/max/photo-6.jpg')}>
              <PageTitle className="text-4xl text-white" delay={0.14}>
                Start a Collaboration
              </PageTitle>
              <p className="mt-2 text-white/70">
                Reach out for games, films, artist partnerships, and live performance concepts.
              </p>
              <form
                action={`https://formsubmit.co/${content?.socials.formsubmit.endpointEmail ?? ''}`}
                method="POST"
                className="mt-6 space-y-4"
              >
                <input type="hidden" name="_subject" value={content?.socials.formsubmit.subject ?? 'New contact'} />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_next" value={`${window.location.origin}${window.location.pathname}#contact`} />
                <label className="block text-sm text-white/85" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="w-full rounded-xl border border-white/25 bg-black/40 px-4 py-3 text-white"
                />
                <label className="block text-sm text-white/85" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-xl border border-white/25 bg-black/40 px-4 py-3 text-white"
                />
                <label className="block text-sm text-white/85" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="w-full rounded-xl border border-white/25 bg-black/40 px-4 py-3 text-white"
                />
                <input
                  type="text"
                  name="_honey"
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
                <button
                  type="submit"
                  className="magnetic-btn rounded-full bg-cyan-300 px-6 py-3 font-medium text-black"
                >
                  Send Message
                </button>
              </form>
              </GlassCard>

              <GlassCard image={assetUrl('media/images/max/photo-2.jpg')}>
              <h3 className="text-2xl text-white">Connect</h3>
              <p className="mt-2 text-white/70">{content?.socials.email}</p>
              <ul className="mt-5 grid grid-cols-2 gap-3">
                {socialLinks.map((social) => (
                  <li key={social.id}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="magnetic-btn flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white/85 hover:text-white"
                    >
                      {social.icon}
                      <span>{social.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
              </GlassCard>
            </div>
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
        <p className="footer-brand text-2xl font-semibold text-white sm:text-4xl">MAX UDOVICHENKO</p>
        <nav className="footer-journeys" aria-label="Explore Max Udovichenko">
          <a href="#work" className="footer-text-link magnetic-btn">View my projects</a>
          <a href="#about" className="footer-text-link magnetic-btn">Get to know me</a>
        </nav>
        <p className="footer-copyright">
          Copyright {new Date().getFullYear()} Max Udovichenko
        </p>
        {content?.socials ? (
          <div className="footer-connect">
            <p className="footer-connect-label">Connect</p>
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
          </div>
        ) : null}
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
