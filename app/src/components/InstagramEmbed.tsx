import { useEffect, useRef } from 'react'

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

function loadInstagramEmbeds() {
  const existingScript = document.querySelector<HTMLScriptElement>('script[data-instagram-embed]')

  if (window.instgrm?.Embeds) {
    window.instgrm.Embeds.process()
    return
  }

  if (existingScript) {
    existingScript.addEventListener('load', () => window.instgrm?.Embeds?.process(), { once: true })
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.defer = true
  script.src = 'https://www.instagram.com/embed.js'
  script.dataset.instagramEmbed = 'true'
  script.onload = () => window.instgrm?.Embeds?.process()
  document.body.appendChild(script)
}

export function InstagramEmbed({ permalink, label = 'Instagram content' }: InstagramEmbedProps) {
  const embedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInstagramEmbeds()
  }, [permalink])

  return (
    <div ref={embedRef} className="instagram-feed-frame" aria-label={label}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
      >
        <div className="instagram-embed-fallback">
          <p>View Max Udovichenko on Instagram.</p>
          <a href={permalink} target="_blank" rel="noreferrer">
            Open Instagram profile
          </a>
        </div>
      </blockquote>
    </div>
  )
}
