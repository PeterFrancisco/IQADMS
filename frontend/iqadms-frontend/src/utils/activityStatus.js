import { normalizePresence } from '../config/presence'

/** Minutes since last API heartbeat / login activity */
const ACTIVE_NOW_MINUTES = 4
/** Show as recently active (green dot) */
const RECENTLY_ACTIVE_MINUTES = 30

function parseUtc(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

export function getActivityStatus({ presence, lastActiveAt } = {}) {
  const normalized = normalizePresence(presence)
  const at = parseUtc(lastActiveAt)
  const now = Date.now()

  if (normalized === 'offline' && at == null) {
    return { label: 'Inactive', active: false, dotColor: '#bcc0c4' }
  }

  if (at == null) {
    if (normalized === 'online') {
      return { label: 'Active now', active: true, dotColor: '#31a24c' }
    }
    return { label: 'Inactive', active: false, dotColor: '#bcc0c4' }
  }

  const minutesAgo = (now - at) / 60000

  if (normalized === 'offline' && minutesAgo > RECENTLY_ACTIVE_MINUTES) {
    return { label: 'Inactive', active: false, dotColor: '#bcc0c4' }
  }

  if (minutesAgo <= ACTIVE_NOW_MINUTES) {
    return { label: 'Active now', active: true, dotColor: '#31a24c' }
  }

  if (minutesAgo <= RECENTLY_ACTIVE_MINUTES) {
    const mins = Math.max(1, Math.round(minutesAgo))
    return {
      label: `Active ${mins}m ago`,
      active: true,
      dotColor: '#31a24c'
    }
  }

  if (minutesAgo <= 24 * 60) {
    const hours = Math.max(1, Math.round(minutesAgo / 60))
    return {
      label: `Active ${hours}h ago`,
      active: false,
      dotColor: '#bcc0c4'
    }
  }

  return { label: 'Inactive', active: false, dotColor: '#bcc0c4' }
}

export function presenceIndicatorFromActivity(memberOrUser) {
  return getActivityStatus({
    presence: memberOrUser?.presence,
    lastActiveAt: memberOrUser?.lastActiveAt
  }).dotColor
}
