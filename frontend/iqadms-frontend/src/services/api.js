import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5135/api'
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

const AUTH_PATHS = new Set(['/', '/login', '/register', '/request-access', '/request-submitted'])

// Automatically attach JWT token
api.interceptors.request.use(config => {
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