import api from '../services/api'

export function getApiOrigin() {
  const base = (api.defaults.baseURL || '').trim()
  if (/^https?:\/\//i.test(base)) {
    return base.replace(/\/api\/?$/i, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return base.replace(/\/api\/?$/i, '')
}

export function resolveUploadUrl(path, cacheKey) {
  if (!path) return null
  const origin = getApiOrigin()
  const base = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`
  if (cacheKey == null || cacheKey === '') return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}v=${encodeURIComponent(String(cacheKey))}`
}
