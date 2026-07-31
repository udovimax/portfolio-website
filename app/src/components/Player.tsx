import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaBackward, FaExpand, FaForward, FaPause, FaPlay, FaTimes, FaVolumeUp } from 'react-icons/fa'
import type { Track } from '../types/content'

interface PlayerProps {
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  expanded: boolean
  visualizerData: number[]
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
  onSeek: (value: number) => void
  onVolumeChange: (value: number) => void
  onToggleExpanded: () => void
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
  expanded,
  visualizerData,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleExpanded,
}: PlayerProps) {
  const [visible, setVisible] = useState(true)

  if (!track) {
    return null
  }

  if (!visible) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-50 rounded-full border border-white/25 bg-black/75 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white shadow-2xl backdrop-blur-xl transition hover:border-white/50 hover:bg-black"
        onClick={() => setVisible(true)}
        aria-label="Show music player"
      >
        Show player
      </button>
    )
  }

  return (
    <motion.aside
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-4 left-1/2 z-50 w-[min(96vw,70rem)] -translate-x-1/2 rounded-3xl border border-white/20 bg-black/65 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      aria-label="Music player"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="magnetic-btn rounded-full border border-white/30 p-2 text-white hover:bg-white/10"
            aria-label={expanded ? 'Collapse visualizer' : 'Expand visualizer'}
            onClick={onToggleExpanded}
          >
            <FaExpand />
          </button>
          <button
            type="button"
            className="magnetic-btn rounded-full border border-white/30 p-2 text-white hover:bg-white/10"
            aria-label="Hide music player"
            onClick={() => setVisible(false)}
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <div className={`${expanded ? 'h-20' : 'h-10'} mb-3 flex items-end gap-1 transition-[height] duration-300`}>
        {visualizerData.map((bar, index) => (
          <span
            key={`bar-${index}`}
            className="w-full rounded-full bg-cyan-300/80"
            style={{
              height: `${Math.max(8, bar * (expanded ? 60 : 28))}px`,
              opacity: 0.3 + bar,
            }}
          />
        ))}
      </div>

      <div className="mb-3">
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="magnetic-btn rounded-full border border-white/30 p-3 text-white hover:bg-white/10"
            onClick={onPrevious}
            aria-label="Previous track"
          >
            <FaBackward />
          </button>
          <button
            type="button"
            className="magnetic-btn rounded-full bg-cyan-300 p-3 text-black"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause track' : 'Play track'}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button
            type="button"
            className="magnetic-btn rounded-full border border-white/30 p-3 text-white hover:bg-white/10"
            onClick={onNext}
            aria-label="Next track"
          >
            <FaForward />
          </button>
        </div>

        <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
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
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 sm:w-36"
          />
        </div>
      </div>
    </motion.aside>
  )
}
