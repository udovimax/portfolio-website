import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Howl, Howler } from 'howler'
import { FaInstagram, FaSoundcloud, FaSpotify, FaYoutube } from 'react-icons/fa'
import { CustomCursor } from './components/CustomCursor'
import { FloatingNav } from './components/FloatingNav'
import { GlassCard } from './components/GlassCard'
import { ProjectModal, VideoModal } from './components/MediaModals'
import { Player } from './components/Player'
import { useLenis } from './hooks/useLenis'
import { useSiteContent } from './hooks/useSiteContent'
import type { NavSection, ProjectItem, Track, VideoItem } from './types/content'

const sectionIds: NavSection[] = ['home', 'music', 'projects', 'about', 'contact']

function App() {
  const shouldReduceMotion = useReducedMotion()
  useLenis(!shouldReduceMotion)

  const { content, error, isLoading } = useSiteContent()

  const [loadingProgress, setLoadingProgress] = useState(0)
  const [activeSection, setActiveSection] = useState<NavSection>('home')
  const [hideNav, setHideNav] = useState(false)
  const [libraryMode, setLibraryMode] = useState<'local' | 'soundcloud'>('local')
  const [playerExpanded, setPlayerExpanded] = useState(false)
  const [visualizerData, setVisualizerData] = useState<number[]>(
    Array.from({ length: 48 }, () => 0.2),
  )

  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.75)

  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null)
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null)
  const [videoResumePoints, setVideoResumePoints] = useState<Record<string, number>>({})

  const howlRef = useRef<Howl | null>(null)
  const initialVolumeRef = useRef(volume)
  const shouldAutoplayRef = useRef(isPlaying)

  const tracks = content?.music.tracks ?? []
  const activeTrack: Track | null = tracks[trackIndex] ?? null

  useEffect(() => {
    initialVolumeRef.current = volume
  }, [volume])

  useEffect(() => {
    shouldAutoplayRef.current = isPlaying
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
    let lastScroll = window.scrollY

    const onScroll = () => {
      const current = window.scrollY
      const delta = current - lastScroll
      if (current < 80) {
        setHideNav(false)
      } else if (delta > 6) {
        setHideNav(true)
      } else if (delta < -6) {
        setHideNav(false)
      }
      lastScroll = current
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) {
          return
        }
        setActiveSection(visible.target.id as NavSection)
      },
      { threshold: [0.2, 0.45, 0.75], rootMargin: '-20% 0px -20% 0px' },
    )

    sectionIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!activeTrack) {
      return
    }

    howlRef.current?.unload()

    const howl = new Howl({
      src: [activeTrack.src],
      html5: true,
      volume: initialVolumeRef.current,
      onplay: () => {
        setIsPlaying(true)
      },
      onpause: () => {
        setIsPlaying(false)
      },
      onstop: () => {
        setIsPlaying(false)
      },
      onload: () => {
        setDuration(howl.duration())
      },
      onend: () => {
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
      howl.play()
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
    const fallback = () => {
      setVisualizerData((previous) =>
        previous.map(() => 0.15 + Math.random() * (isPlaying ? 0.65 : 0.25)),
      )
    }

    const ctx = Howler.ctx
    const gainNode = Howler.masterGain

    if (!ctx || !gainNode) {
      const interval = window.setInterval(fallback, 120)
      return () => {
        window.clearInterval(interval)
      }
    }

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    const data = new Uint8Array(analyser.frequencyBinCount)
    gainNode.connect(analyser)

    let frame = 0
    const animate = () => {
      analyser.getByteFrequencyData(data)
      setVisualizerData((previous) =>
        previous.map((_, index) => (data[index] ?? data[data.length - 1] ?? 0) / 255),
      )
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      analyser.disconnect()
    }
  }, [isPlaying])

  const togglePlay = () => {
    const howl = howlRef.current
    if (!howl) {
      return
    }
    if (howl.playing()) {
      howl.pause()
      return
    }
    howl.play()
  }

  const playSpecificTrack = (index: number) => {
    setTrackIndex(index)
    setIsPlaying(true)
  }

  const goPrevious = () => {
    if (!tracks.length) {
      return
    }
    setTrackIndex((previous) => (previous - 1 + tracks.length) % tracks.length)
    setIsPlaying(true)
  }

  const goNext = () => {
    if (!tracks.length) {
      return
    }
    setTrackIndex((previous) => (previous + 1) % tracks.length)
    setIsPlaying(true)
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
        id: 'youtube',
        href: content.socials.youtube,
        label: 'YouTube',
        icon: <FaYoutube aria-hidden="true" />,
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
                Max Kingston
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

      <CustomCursor />
      <FloatingNav hidden={hideNav} activeSection={activeSection} />

      <main className="relative pb-56 text-white">
        <section id="home" className="section-shell min-h-screen pt-28">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mb-8 text-xs uppercase tracking-[0.32em] text-cyan-300"
          >
            Cinematic Portfolio
          </motion.p>
          <h1 className="text-balance text-6xl font-bold leading-[0.9] sm:text-8xl md:text-9xl">
            {content?.about.name}
          </h1>
          <div className="mt-8 space-y-3 text-2xl text-white/75 sm:text-4xl">
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
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mt-10 max-w-3xl text-lg text-white/70"
          >
            {content?.about.intro}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.28, duration: 0.7 }}
            className="mt-16 grid max-w-4xl gap-5 border-t border-white/20 pt-4 text-xs uppercase tracking-[0.2em] text-white/55 sm:grid-cols-[1fr_auto]"
          >
            <span>Original music / spatial sound / visual worlds</span>
            <a href="#music" className="magnetic-btn text-white hover:text-[var(--accent)]">
              Enter the work <span aria-hidden="true">↘</span>
            </a>
          </motion.div>
        </section>

        <section id="music" className="section-shell">
          <div className="section-heading sticky top-24 z-10 mb-8 inline-flex rounded-full border border-white/20 bg-black/45 px-4 py-2 backdrop-blur-md">
            Music
          </div>

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-4xl font-semibold sm:text-6xl">{content?.music.featuredAlbum}</h2>
              <p className="mt-2 max-w-2xl text-white/70">{content?.music.description}</p>
            </div>
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
          </div>

          {libraryMode === 'local' ? (
            <div className="grid gap-5 md:grid-cols-2">
              {tracks.map((track, index) => (
                <GlassCard key={track.id} className="cursor-pointer" >
                  <div data-cursor-reactive className="space-y-4">
                    <img
                      src={track.artwork}
                      alt={`${track.title} artwork`}
                      loading="lazy"
                      className="h-52 w-full rounded-2xl object-cover"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{track.year}</p>
                        <h3 className="text-2xl text-white">{track.title}</h3>
                        <p className="text-white/70">{track.description}</p>
                      </div>
                      <button
                        type="button"
                        className="magnetic-btn rounded-full border border-white/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white"
                        onClick={() => playSpecificTrack(index)}
                        aria-label={`Play ${track.title}`}
                      >
                        Play
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{track.duration}</span>
                      <span>{track.credits}</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard>
              <h3 className="mb-3 text-xl text-white">{content?.music.soundcloud.title}</h3>
              <div className="rounded-2xl border border-white/15 bg-black/40 p-2">
                <iframe
                  title="Max Kingston SoundCloud Playlist"
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
        </section>

        <section id="projects" className="section-shell">
          <div className="section-heading mb-8 inline-flex rounded-full border border-white/20 bg-black/45 px-4 py-2 backdrop-blur-md">
            Projects & Video
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {content?.projects.projects.map((project) => {
              const linkedVideo = content.videos.videos.find((video) => video.id === project.videoId)
              return (
                <GlassCard key={project.id} className="card-tilt">
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => setActiveProject(project)}
                    data-cursor-reactive
                  >
                    <img
                      src={project.thumbnail}
                      alt={`${project.title} thumbnail`}
                      loading="lazy"
                      className="mb-4 h-56 w-full rounded-2xl object-cover"
                    />
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                      {project.type} / {project.year}
                    </p>
                    <h3 className="text-3xl text-white">{project.title}</h3>
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
              )
            })}
          </div>
        </section>

        <section id="about" className="section-shell">
          <div className="section-heading mb-8 inline-flex rounded-full border border-white/20 bg-black/45 px-4 py-2 backdrop-blur-md">
            About
          </div>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-4xl font-semibold sm:text-6xl">Artistic Philosophy</h2>
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
            <ol className="space-y-4">
              {content?.about.timeline.map((item) => (
                <li key={`${item.year}-${item.title}`} className="timeline-item rounded-2xl border border-white/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{item.year}</p>
                  <h3 className="mt-1 text-xl text-white">{item.title}</h3>
                  <p className="mt-2 text-white/70">{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contact" className="section-shell pb-36">
          <div className="section-heading mb-8 inline-flex rounded-full border border-white/20 bg-black/45 px-4 py-2 backdrop-blur-md">
            Contact
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <GlassCard>
              <h2 className="text-4xl text-white">Start a Collaboration</h2>
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

            <GlassCard>
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
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-10 text-center">
        <p className="text-3xl font-semibold text-white sm:text-5xl">MAX KINGSTON</p>
        <p className="mt-3 text-sm uppercase tracking-[0.18em] text-white/60">
          Copyright {new Date().getFullYear()} Max Kingston
        </p>
      </footer>

      <Player
        track={activeTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        expanded={playerExpanded}
        visualizerData={visualizerData}
        onTogglePlay={togglePlay}
        onPrevious={goPrevious}
        onNext={goNext}
        onSeek={seekTo}
        onVolumeChange={setVolume}
        onToggleExpanded={() => setPlayerExpanded((value) => !value)}
      />

      <VideoModal
        video={activeVideo}
        isOpen={Boolean(activeVideo)}
        onClose={() => setActiveVideo(null)}
        onTimeUpdate={(id, value) => {
          setVideoResumePoints((previous) => ({ ...previous, [id]: value }))
        }}
        resumeTime={activeVideo ? videoResumePoints[activeVideo.id] : undefined}
      />

      <ProjectModal
        project={activeProject}
        isOpen={Boolean(activeProject)}
        onClose={() => setActiveProject(null)}
      />
    </>
  )
}

export default App
