import { useEffect, useState } from 'react'
import { resolveUploadUrl } from '../utils/apiOrigin'
import '../theme/user-avatar.css'

export function memberInitials(member) {
  const name = member?.displayName || member?.username || member?.assignedToName || '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * @param {{ member?: object, user?: object, size?: number, className?: string, title?: string, cacheKey?: string|number }} props
 * member/user may include profilePictureUrl, displayName, username
 */
export default function UserAvatar({
  member,
  user,
  size = 40,
  className = '',
  title,
  cacheKey
}) {
  const data = member || user || {}
  const resolvedSrc = resolveUploadUrl(
    data.profilePictureUrl,
    cacheKey ?? data.profilePictureUrl
  )
  const [imgFailed, setImgFailed] = useState(false)
  const src = resolvedSrc && !imgFailed ? resolvedSrc : null

  useEffect(() => {
    setImgFailed(false)
  }, [resolvedSrc])
  const initials = memberInitials(data)
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.36) }

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`user-avatar user-avatar-img ${className}`.trim()}
        style={style}
        title={title}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <span
      className={`user-avatar user-avatar-fallback ${className}`.trim()}
      style={style}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      {initials}
    </span>
  )
}
