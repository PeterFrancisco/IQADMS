import api from '../services/api'

export async function setPresence(presence) {
  const res = await api.put('/Profile/me/presence', { presence })
  window.dispatchEvent(
    new CustomEvent('iqadms-presence-changed', {
      detail: { presence: res.data.presence, lastActiveAt: res.data.lastActiveAt }
    })
  )
  return res.data.presence
}

export async function markOnlineIfNeeded() {
  try {
    await setPresence('online')
  } catch {
    // ignore when session invalid
  }
}

export function startPresenceHeartbeat(intervalMs = 60000) {
  const tick = () => {
    api
      .post('/Profile/me/heartbeat')
      .then(res => {
        window.dispatchEvent(
          new CustomEvent('iqadms-presence-changed', {
            detail: {
              presence: res.data.presence,
              lastActiveAt: res.data.lastActiveAt
            }
          })
        )
      })
      .catch(() => {})
  }
  tick()
  return window.setInterval(tick, intervalMs)
}
