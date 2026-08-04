import axios from 'axios'
import {
  readAuthToken,
  clearAuthSession,
  getRememberMe,
  persistAuthToken,
  getTokenExpiryMs
} from '../utils/authSession'
import { readAuthTokenFromResponse } from '../utils/authToken'

function resolveApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && String(fromEnv).trim()) {
    let url = String(fromEnv).trim().replace(/\/+$/, '')
    if (
      typeof window !== 'undefined'
      && window.location.protocol === 'https:'
      && /^http:\/\//i.test(url)
    ) {
      return '/api'
    }
    return url
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:5135/api'
  }
  return '/api'
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true
})

const AUTH_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/complete-registration',
  '/request-access',
  '/request-submitted'
])

const PUBLIC_AUTH_API_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/check-email',
  '/auth/request-access',
  '/auth/refresh',
  '/auth/logout'
]

function isPublicAuthRequest(url) {
  const path = (url || '').split('?')[0].toLowerCase()
  return PUBLIC_AUTH_API_PREFIXES.some(prefix => path.startsWith(prefix))
}

let refreshInFlight = null

export async function refreshSessionToken() {
  const token = readAuthToken()
  if (!token) return null

  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const res = await axios.post(
        `${resolveApiBaseUrl()}/Auth/refresh`,
        { rememberMe: getRememberMe() },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
          timeout: 15000
        }
      )
      const next = readAuthTokenFromResponse(res.data)
      if (next) {
        persistAuthToken(next)
        return next
      }
      return null
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export function startSessionKeepAlive() {
  if (typeof window === 'undefined') return () => {}

  const tick = async () => {
    const token = readAuthToken()
    if (!token) return
    const exp = getTokenExpiryMs(token)
    if (!exp) return
    const msLeft = exp - Date.now()
    // Renew when less than 3 days left (or already expired but within server grace window)
    if (msLeft < 3 * 24 * 60 * 60 * 1000) {
      await refreshSessionToken()
    }
  }

  tick()
  const id = window.setInterval(tick, 30 * 60 * 1000)
  return () => clearInterval(id)
}

api.interceptors.request.use(config => {
  if (isPublicAuthRequest(config.url)) {
    return config
  }

  const token = readAuthToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && original && !original._authRetried) {
      if (!isPublicAuthRequest(original.url)) {
        original._authRetried = true
        const next = await refreshSessionToken()
        if (next) {
          original.headers.Authorization = `Bearer ${next}`
          return api.request(original)
        }
      }
    }

    if (error.response?.status === 401) {
      const path = window.location.pathname.replace(/\/$/, '') || '/'
      if (!AUTH_PATHS.has(path)) {
        clearAuthSession()
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(`/login?session=expired&next=${next}`)
      }
    }
    return Promise.reject(error)
  }
)

export default api
