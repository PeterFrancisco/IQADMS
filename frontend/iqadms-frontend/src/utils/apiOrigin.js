import api from '../services/api'

export function getApiOrigin() {
  return (api.defaults.baseURL || '').replace(/\/api\/?$/, '')
}

export function resolveUploadUrl(path, cacheKey) {
  if (!path) return null
  const origin = getApiOrigin()
  const base = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`
  if (cacheKey == null || cacheKey === '') return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}v=${encodeURIComponent(String(cacheKey))}`
}
