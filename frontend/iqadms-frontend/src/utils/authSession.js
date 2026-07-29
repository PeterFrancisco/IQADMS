const SESSION_COOKIE = 'iqadms_session'
const REMEMBER_COOKIE = 'iqadms_remember'

function cookieSecureSuffix() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
}

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name, value, maxAgeSeconds, httpOnly = false) {
  if (typeof document === 'undefined') return
  if (httpOnly) return
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${cookieSecureSuffix()}`
}

function deleteClientCookie(name) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${cookieSecureSuffix()}`
}

const TOKEN_KEY = 'token'
const REMEMBER_KEY = 'iqadmsRememberMe'

export function getRememberMe() {
  const fromCookie = readCookie(REMEMBER_COOKIE)
  if (fromCookie === '0') return false
  if (fromCookie === '1') return true
  const v = localStorage.getItem(REMEMBER_KEY)
  if (v === 'false') return false
  return true
}

export function setRememberMe(value) {
  localStorage.setItem(REMEMBER_KEY, value ? 'true' : 'false')
  writeCookie(REMEMBER_COOKIE, value ? '1' : '0', value ? 60 * 60 * 24 * 400 : 60 * 60 * 8)
}

export function readAuthToken() {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim()
  }
  return trimmed
}

export function persistAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('username')
  localStorage.removeItem('isAdmin')
  localStorage.removeItem('userId')
  localStorage.removeItem('userEmail')
  localStorage.removeItem(REMEMBER_KEY)
  deleteClientCookie(REMEMBER_COOKIE)
}

export function getTokenExpiryMs(token) {
  try {
    const part = token.split('.')[1]
    if (!part) return 0
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.exp) return 0
    return payload.exp * 1000
  } catch {
    return 0
  }
}

export function isSignedIn() {
  return Boolean(readAuthToken())
}

/** HttpOnly session cookie is set by the API; this exposes the remember preference only. */
export { SESSION_COOKIE, REMEMBER_COOKIE, readCookie }
