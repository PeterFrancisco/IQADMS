import UserAvatar from './UserAvatar'
import { getActivityStatus } from '../utils/activityStatus'
import '../theme/user-avatar.css'

/** Facebook-style active dot on the profile photo corner */
export default function AvatarWithPresence({
  member,
  user,
  size = 40,
  className = '',
  title,
  cacheKey,
  showPresence = true
}) {
  const data = member || user || {}
  const { dotColor } = getActivityStatus({
    presence: data.presence,
    lastActiveAt: data.lastActiveAt
  })
  const dotSize = Math.max(10, Math.round(size * 0.26))

  return (
    <span
      className={`avatar-with-presence ${className}`.trim()}
      style={{ width: size, height: size }}
      title={title}
    >
      <UserAvatar
        member={member}
        user={user}
        size={size}
        cacheKey={cacheKey}
      />
      {showPresence && (
        <span
          className="avatar-presence-dot"
          style={{
            width: dotSize,
            height: dotSize,
            background: dotColor
          }}
          aria-hidden
        />
      )}
    </span>
  )
}
