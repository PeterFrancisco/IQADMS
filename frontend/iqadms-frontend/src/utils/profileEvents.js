export function notifyProfileUpdated(detail = {}) {
  window.dispatchEvent(new CustomEvent('iqadms-profile-updated', { detail }))
}
