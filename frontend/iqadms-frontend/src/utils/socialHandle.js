/** Extract display handle from a social profile URL */
export function socialHandleFromUrl(platformId, rawUrl) {
  const url = (rawUrl || '').trim()
  if (!url) return ''

  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const u = new URL(withProto)
    const parts = u.pathname.split('/').filter(Boolean)

    switch (platformId) {
      case 'github':
        return parts[0] || ''
      case 'twitter':
        return (parts[0] || '').replace(/^@/, '')
      case 'instagram':
      case 'facebook':
        return (parts[0] || '').replace(/^@/, '')
      case 'linkedin':
        if (parts[0] === 'in' || parts[0] === 'company') return parts[1] || parts[0] || ''
        return parts[parts.length - 1] || ''
      default:
        return parts[parts.length - 1] || u.hostname
    }
  } catch {
    const stripped = url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    const seg = stripped.split('/').pop()
    return seg || stripped
  }
}
