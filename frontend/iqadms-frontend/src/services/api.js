import axios from 'axios'

function resolveApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim().replace(/\/+$/, '')
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:5135/api'
  }
  // Production: same host as the SPA (reverse proxy /api → API)
  return '/api'
}

const api = axios.create({
  baseURL: resolveApiBaseUrl()
})

function readAuthToken() {
  const raw = localStorage.getItem('token')
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim()
  }
  return trimmed
}

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
  '/auth/request-access'
]

function isPublicAuthRequest(url) {
  const path = (url || '').split('?')[0].toLowerCase()
  return PUBLIC_AUTH_API_PREFIXES.some(prefix => path.startsWith(prefix))
}

// Automatically attach JWT token (skip on login/register so stale tokens cannot break auth)
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
  error => {
    if (error.response?.status === 401) {
      const path = window.location.pathname.replace(/\/$/, '') || '/'
      if (!AUTH_PATHS.has(path)) {
        localStorage.removeItem('token')
        localStorage.removeItem('isAdmin')
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(`/login?session=expired&next=${next}`)
      }
    }
    return Promise.reject(error)
  }
)

export default api