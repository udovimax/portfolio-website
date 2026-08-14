/**
 * Purpose: Record lightweight, anonymous page-view counts for Max's private
 * dashboard through the existing public Apps Script endpoint.
 *
 * Constraints: This must never block rendering, collect personal identifiers,
 * or become a prerequisite for the contact form. One view is recorded per
 * page per browser session.
 */
import { useEffect, useRef } from 'react'

export function usePageAnalytics(endpoint: string | undefined, page: string) {
  const recordedPagesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!endpoint || recordedPagesRef.current.has(page)) {
      return
    }

    recordedPagesRef.current.add(page)
    const data = new FormData()
    data.append('_type', 'pageview')
    data.append('page', page)
    data.append('path', window.location.pathname)

    void fetch(endpoint, {
      method: 'POST',
      body: data,
      mode: 'no-cors',
      keepalive: true,
    }).catch(() => undefined)
  }, [endpoint, page])
}
