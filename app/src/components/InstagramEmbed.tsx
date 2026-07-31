import { useEffect } from 'react'

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
    instagramScriptPromise = new Promise<void>((resolve) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-instagram-embed]')
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        return
      }

      const script = document.createElement('script')
      script.async = true
      script.defer = true
      script.src = 'https://platform.instagram.com/en_US/embeds.js'
      script.dataset.instagramEmbed = 'true'
      script.onload = () => resolve()
      document.body.appendChild(script)
    })
  }

  return instagramScriptPromise
}

export function InstagramEmbed({ permalink, label = 'Instagram content' }: InstagramEmbedProps) {
  useEffect(() => {
    void loadInstagramEmbeds().then(() => {
      window.requestAnimationFrame(() => window.instgrm?.Embeds?.process())
    })
  }, [permalink])

  return (
    <div className="instagram-feed-frame" aria-label={label}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="2"
      >
        <div className="instagram-embed-fallback">
          <p>View Max Udovichenko on Instagram.</p>
          <a href={permalink} target="_top" rel="noreferrer">
            View on Instagram
          </a>
        </div>
      </blockquote>
    </div>
  )
}
