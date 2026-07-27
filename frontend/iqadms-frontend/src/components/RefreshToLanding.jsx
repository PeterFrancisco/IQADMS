import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Public routes that should not redirect to home on browser refresh. */
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
 * On full page reload, show the public landing page unless the user refreshed
 * a public auth/onboarding route.
 */
export default function RefreshToLanding() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const entry = performance.getEntriesByType('navigation')[0]
    const isReload = entry?.type === 'reload'
    if (!isReload) return
    if (PUBLIC_PATHS.has(location.pathname)) return
    navigate('/', { replace: true })
  }, [location.pathname, navigate])

  return null
}
