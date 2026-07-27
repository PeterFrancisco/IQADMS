import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/** Routes that must never be replaced by the reload → home behavior. */
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/request-account',
  '/request-access',
  '/request-submitted',
  '/complete-registration'
])

/**
 * On full page reload only (once per load), send authenticated users back to the
 * public home page from in-app URLs. Unauthenticated reloads on protected routes
 * are left to ProtectedRoute → /login.
 */
export default function RefreshToLanding() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const entry = performance.getEntriesByType('navigation')[0]
    if (entry?.type !== 'reload') return

    const path = window.location.pathname
    if (PUBLIC_PATHS.has(path)) return

    const token = localStorage.getItem('token')
    if (!token) return

    navigate('/', { replace: true })
  }, [navigate])

  return null
}
