import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../services/api'
import { appToast } from '../utils/appToast'
import { isSignedIn } from '../utils/authSession'
import { resolveNotificationLink } from '../utils/notificationLink'

const POLL_MS = 8000

/** Polls for new notifications and shows top-center toasts with sound. */
export default function NotificationToastWatcher() {
  const seenIdsRef = useRef(new Set())
  const bootstrappedRef = useRef(false)
  const location = useLocation()

  useEffect(() => {
    if (!isSignedIn()) return undefined

    let cancelled = false

    async function poll() {
      try {
        const res = await api.get('/Notifications', { params: { unreadOnly: true } })
        if (cancelled) return

        const items = res.data || []
        const seen = seenIdsRef.current

        if (!bootstrappedRef.current) {
          items.forEach(n => seen.add(n.id))
          bootstrappedRef.current = true
          return
        }

        for (const n of items) {
          if (seen.has(n.id)) continue
          seen.add(n.id)
          appToast.notification({
            title: n.title || 'Notification',
            body: n.body,
            linkPath: resolveNotificationLink(n),
            silent: false
          })
        }

        if (seen.size > 200) {
          const keep = new Set(items.map(n => n.id))
          seenIdsRef.current = keep
        }
      } catch {
        // ignore when offline or session expired
      }
    }

    poll()
    const id = window.setInterval(poll, POLL_MS)
    const onChange = () => poll()
    window.addEventListener('iqadms-notifications-changed', onChange)

    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('iqadms-notifications-changed', onChange)
    }
  }, [location.pathname])

  return null
}
