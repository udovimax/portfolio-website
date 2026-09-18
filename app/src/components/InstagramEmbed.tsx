import { useEffect, useState } from 'react'

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void
      }
    }
  }
}

interface InstagramEmbedProps {
  permalink: string
  label?: string
}

let instagramScriptPromise: Promise<void> | null = null

function loadInstagramEmbeds() {
  if (window.instgrm?.Embeds) {
    return Promise.resolve()
  }

  if (!instagramScriptPromise) {
    instagramScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-instagram-embed]')
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Instagram embed failed to load')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.async = true
      script.defer = true
      script.src = 'https://platform.instagram.com/en_US/embeds.js'
      script.dataset.instagramEmbed = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Instagram embed failed to load'))
      document.body.appendChild(script)
    })
  }

  return instagramScriptPromise
}

export function InstagramEmbed({ permalink, label = 'Instagram content' }: InstagramEmbedProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let active = true
    setStatus('loading')
    void loadInstagramEmbeds().then(() => {
      if (!active) return
      setStatus('ready')
      window.requestAnimationFrame(() => window.instgrm?.Embeds?.process())
    }).catch(() => {
      if (active) setStatus('error')
    })

    return () => {
      active = false
    }
  }, [permalink])

  return (
    <div className="instagram-feed-frame" aria-label={label}>
      <p className="instagram-embed-status" role="status" aria-live="polite">
        {status === 'loading'
          ? 'Loading Instagram preview…'
          : status === 'error'
            ? 'Instagram preview is unavailable. Use the direct link below.'
            : 'Instagram preview loaded. A direct link is also available below.'}
      </p>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="2"
      >
        <div className="instagram-embed-fallback">
          <p>View Max Udovichenko on Instagram.</p>
          <a href={permalink} target="_blank" rel="noreferrer">
            View on Instagram
          </a>
        </div>
      </blockquote>
    </div>
  )
}
