/** Shared PQAD member presence / activity status */
export const PRESENCE_OPTIONS = [
  { id: 'online', label: 'Online', color: '#22c55e', hint: 'Available for tasks and messages' },
  { id: 'away', label: 'Away', color: '#eab308', hint: 'Stepped away; may reply later' },
  { id: 'dnd', label: 'Do Not Disturb', color: '#ef4444', hint: 'Please avoid non-urgent contact' },
  { id: 'offline', label: 'Offline', color: '#94a3b8', hint: 'Not available' }
]

export const PRESENCE_MAP = Object.fromEntries(PRESENCE_OPTIONS.map(o => [o.id, o]))

export function normalizePresence(value) {
  const v = (value || '').toLowerCase()
  return PRESENCE_MAP[v] ? v : 'offline'
}

/** Green dot when member is actively signed in (online), gray when inactive */
export function isActivePresence(value) {
  return normalizePresence(value) === 'online'
}

export function presenceIndicatorColor(value) {
  return isActivePresence(value) ? '#31a24c' : '#bcc0c4'
}
