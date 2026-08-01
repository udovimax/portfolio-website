import { useMemo, useState, type CSSProperties, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import {
  FaBackward,
  FaExpand,
  FaForward,
  FaPause,
  FaPlay,
  FaTimes,
  FaVolumeUp,
} from 'react-icons/fa'
import type { Track } from '../types/content'

interface PlayerProps {
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  visualizerData: number[]
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
  onSeek: (value: number) => void
  onVolumeChange: (value: number) => void
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) {
    return '0:00'
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function Player({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  visualizerData,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
}: PlayerProps) {
  const [visible, setVisible] = useState(true)
  const [minimized, setMinimized] = useState(true)
  const [controlsRevealed, setControlsRevealed] = useState(false)

  const energy = useMemo(() => {
    if (!visualizerData.length) {
      return 0.02
    }

    return Math.min(
      1,
      visualizerData.reduce((total, value) => total + value, 0) / visualizerData.length,
    )
  }, [visualizerData])

  const playerStyle = {
    '--player-energy': energy,
    '--player-glow': `rgba(158, 201, 255, ${0.1 + energy * 0.28})`,
    background: `radial-gradient(circle at 8% 0%, rgba(158, 201, 255, ${0.1 + energy * 0.28}), transparent 58%), radial-gradient(circle at 100% 100%, rgba(228, 173, 149, ${0.04 + energy * 0.16}), transparent 52%), rgba(7, 10, 15, 0.88)`,
    boxShadow: `0 18px 60px rgba(0, 0, 0, 0.52), 0 0 ${14 + energy * 24}px rgba(158, 201, 255, ${0.04 + energy * 0.16})`,
  } as CSSProperties

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target
    if (target instanceof HTMLElement && target.closest('button, input, a')) {
      return
    }
    setControlsRevealed((value) => !value)
  }

  if (!track) {
    return null
  }

  if (!visible) {
    return (
      <button
        type="button"
        className="player-reopen fixed right-4 z-50 border border-white/25 bg-black/75 text-white shadow-2xl backdrop-blur-xl transition hover:border-white/50 hover:bg-black"
        onClick={() => setVisible(true)}
        aria-label="Show music player"
      >
        <img src={track.artwork} alt="" />
        <span className="player-reopen-icon" aria-hidden="true">
          <FaExpand />
        </span>
      </button>
    )
  }

  return (
    <motion.aside
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`player-shell group fixed z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-3xl border border-white/20 p-3 backdrop-blur-2xl ${minimized ? 'player-shell-minimized' : ''} ${controlsRevealed ? 'player-controls-revealed' : ''}`}
      style={playerStyle}
      aria-label="Music player"
      onClick={handleCardClick}
      onMouseLeave={() => setControlsRevealed(false)}
    >
      {minimized ? (
        <div className="player-mini-square">
          <img
            src={track.artwork}
            alt={`${track.title} artwork`}
            className="player-mini-art"
          />
          <div className="player-mini-overlay">
            <div className="player-mini-marquee" aria-label={track.title}>
              <span>{track.title}</span>
              <span aria-hidden="true">{track.title}</span>
            </div>
            <p className="player-mini-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
          <div className="player-actions absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
            <button
              type="button"
              className="player-action magnetic-btn rounded-full border border-white/30 bg-black/35 p-1.5 text-white hover:bg-black/60"
              aria-label="Expand music player"
              onClick={() => setMinimized(false)}
            >
              <FaExpand />
            </button>
            <button
              type="button"
              className="player-action magnetic-btn rounded-full border border-white/30 bg-black/35 p-1.5 text-white hover:bg-black/60"
              aria-label="Hide music player"
              onClick={() => setVisible(false)}
            >
              <FaTimes />
            </button>
          </div>
          <div className="player-mini-controls flex items-center gap-1">
            <button
              type="button"
              className="player-transport-action magnetic-btn rounded-full border border-white/30 p-2.5 text-white hover:bg-white/10"
              onClick={onPrevious}
              aria-label="Previous track"
            >
              <FaBackward />
            </button>
            <button
              type="button"
              className="player-transport-action magnetic-btn rounded-full bg-cyan-300 p-3 text-black"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause track' : 'Play track'}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button
              type="button"
              className="player-transport-action magnetic-btn rounded-full border border-white/30 p-2.5 text-white hover:bg-white/10"
              onClick={onNext}
              aria-label="Next track"
            >
              <FaForward />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="player-header mb-3 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={track.artwork}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
              />
              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-[0.25em] text-cyan-300">Now playing</p>
                <h3 className="truncate text-lg font-medium text-white">{track.title}</h3>
                <p className="truncate text-sm text-white/70">{track.artist}</p>
              </div>
            </div>
            <div className="player-actions flex items-center gap-2">
              <button
                type="button"
                className="player-action magnetic-btn rounded-full border border-white/30 p-2 text-white hover:bg-white/10"
                aria-label="Minimize music player"
                onClick={() => setMinimized(true)}
              >
                <span aria-hidden="true">-</span>
              </button>
              <button
                type="button"
                className="player-action magnetic-btn rounded-full border border-white/30 p-2 text-white hover:bg-white/10"
                aria-label="Hide music player"
                onClick={() => setVisible(false)}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="player-visualizer mb-3 flex items-end gap-1" aria-hidden="true">
            {visualizerData.map((bar, index) => (
              <span
                key={`bar-${index}`}
                className="w-full rounded-full bg-cyan-300/80"
                style={{
                  height: `${Math.max(3, bar * 14)}px`,
                  opacity: 0.25 + bar * 0.75,
                }}
              />
            ))}
          </div>

          <div className="player-timeline mb-3">
            <label className="sr-only" htmlFor="seek">
              Seek position
            </label>
            <input
              id="seek"
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              value={Math.min(currentTime, duration || 1)}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20"
            />
            <div className="mt-1 flex justify-between text-xs text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-controls flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="magnetic-btn rounded-full border border-white/30 p-2.5 text-white hover:bg-white/10"
                onClick={onPrevious}
                aria-label="Previous track"
              >
                <FaBackward />
              </button>
              <button
                type="button"
                className="magnetic-btn rounded-full bg-cyan-300 p-2.5 text-black"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause track' : 'Play track'}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
              <button
                type="button"
                className="magnetic-btn rounded-full border border-white/30 p-2.5 text-white hover:bg-white/10"
                onClick={onNext}
                aria-label="Next track"
              >
                <FaForward />
              </button>
            </div>

            <div className="player-volume ml-auto flex w-full items-center gap-3 sm:w-auto">
              <FaVolumeUp className="text-white/70" aria-hidden="true" />
              <label htmlFor="volume" className="sr-only">
                Player volume
              </label>
              <input
                id="volume"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => onVolumeChange(Number(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 sm:w-28"
              />
            </div>
          </div>
        </>
      )}
    </motion.aside>
  )
}
