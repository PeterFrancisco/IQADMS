import api from '../services/api'
import { isSignedIn } from './authSession'

const STORAGE = {
  theme: 'iqadms-theme',
  accent: 'iqadms-accent',
  fontSize: 'iqadms-font-size',
  muted: 'iqadms-notifications-muted',
  volume: 'iqadms-notification-volume'
}

const DEFAULT_NOTIFICATION_VOLUME = 85

export const THEMES = ['original', 'light', 'dark']
export const ACCENTS = ['maroon', 'slate', 'ocean', 'forest']
export const FONT_SIZES = ['small', 'medium', 'large']

let saveTimer = null
let saveInFlight = null

function prefsCacheKey(userId) {
  return `iqadms-prefs-cache-${userId}`
}

function readCache(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(prefsCacheKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(userId, prefs) {
  if (!userId || !prefs) return
  localStorage.setItem(prefsCacheKey(userId), JSON.stringify(prefs))
}

function normalizeServerPrefs(data) {
  if (!data) return null
  const theme = String(data.theme ?? data.Theme ?? 'original').toLowerCase()
  const accent = String(data.accent ?? data.Accent ?? 'maroon').toLowerCase()
  const fontSize = String(data.fontSize ?? data.FontSize ?? 'medium').toLowerCase()
  const muted = data.notificationsMuted ?? data.NotificationsMuted ?? false
  const volumeRaw = data.notificationVolume ?? data.NotificationVolume
  return {
    theme: THEMES.includes(theme) ? theme : 'original',
    accent: ACCENTS.includes(accent) ? accent : 'maroon',
    fontSize: FONT_SIZES.includes(fontSize) ? fontSize : 'medium',
    notificationsMuted: Boolean(muted),
    notificationVolume: normalizeNotificationVolume(volumeRaw)
  }
}

function normalizeNotificationVolume(value) {
  if (value == null || value === '') return DEFAULT_NOTIFICATION_VOLUME
  const n = Number(value)
  if (Number.isNaN(n)) return DEFAULT_NOTIFICATION_VOLUME
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function getPreferencesSnapshot() {
  return {
    theme: getTheme(),
    accent: getAccent(),
    fontSize: getFontSize(),
    notificationsMuted: isNotificationsMuted(),
    notificationVolume: getNotificationVolumePercent()
  }
}

function applyPreferencesObject(prefs, { persistLocal = true } = {}) {
  if (!prefs) return
  if (persistLocal) {
    localStorage.setItem(STORAGE.theme, prefs.theme)
    localStorage.setItem(STORAGE.accent, prefs.accent)
    localStorage.setItem(STORAGE.fontSize, prefs.fontSize)
    localStorage.setItem(STORAGE.muted, prefs.notificationsMuted ? 'true' : 'false')
    localStorage.setItem(STORAGE.volume, String(normalizeNotificationVolume(prefs.notificationVolume)))
  }
  applyUserPreferences()
  window.dispatchEvent(new CustomEvent('iqadms-preferences-changed', { detail: prefs }))
}

export function getTheme() {
  const v = localStorage.getItem(STORAGE.theme)
  return THEMES.includes(v) ? v : 'original'
}

export function setTheme(theme, { sync = true } = {}) {
  localStorage.setItem(STORAGE.theme, THEMES.includes(theme) ? theme : 'original')
  applyTheme()
  if (sync) scheduleSavePreferences()
}

export function getAccent() {
  const v = localStorage.getItem(STORAGE.accent)
  return ACCENTS.includes(v) ? v : 'maroon'
}

export function setAccent(accent, { sync = true } = {}) {
  localStorage.setItem(STORAGE.accent, ACCENTS.includes(accent) ? accent : 'maroon')
  applyAccent()
  if (sync) scheduleSavePreferences()
}

export function getFontSize() {
  const v = localStorage.getItem(STORAGE.fontSize)
  return FONT_SIZES.includes(v) ? v : 'medium'
}

export function setFontSize(size, { sync = true } = {}) {
  localStorage.setItem(STORAGE.fontSize, FONT_SIZES.includes(size) ? size : 'medium')
  applyFontSize()
  if (sync) scheduleSavePreferences()
}

export function isNotificationsMuted() {
  return localStorage.getItem(STORAGE.muted) === 'true'
}

export function setNotificationsMuted(muted, { sync = true } = {}) {
  localStorage.setItem(STORAGE.muted, muted ? 'true' : 'false')
  if (sync) scheduleSavePreferences()
}

export function getNotificationVolumePercent() {
  return normalizeNotificationVolume(localStorage.getItem(STORAGE.volume))
}

/** 0–1 multiplier for Web Audio gain. */
export function getNotificationVolume() {
  return getNotificationVolumePercent() / 100
}

export function setNotificationVolume(percent, { sync = true } = {}) {
  localStorage.setItem(STORAGE.volume, String(normalizeNotificationVolume(percent)))
  if (sync) scheduleSavePreferences()
}

export function applyTheme() {
  const theme = getTheme()
  document.documentElement.setAttribute('data-theme', theme)
}

export function applyAccent() {
  document.documentElement.setAttribute('data-accent', getAccent())
}

export function applyFontSize() {
  const size = getFontSize()
  document.documentElement.setAttribute('data-font-size', size)
}

export function applyUserPreferences() {
  applyTheme()
  applyAccent()
  applyFontSize()
}

export async function loadUserPreferencesFromServer() {
  if (!isSignedIn()) return null

  const userId = localStorage.getItem('userId')
  const cached = readCache(userId)
  if (cached) {
    applyPreferencesObject(cached, { persistLocal: true })
  }

  try {
    const res = await api.get('/Profile/me/preferences')
    const prefs = normalizeServerPrefs(res.data)
    if (prefs) {
      const isDefault =
        prefs.theme === 'original'
        && prefs.accent === 'maroon'
        && prefs.fontSize === 'medium'
        && !prefs.notificationsMuted
        && prefs.notificationVolume === DEFAULT_NOTIFICATION_VOLUME
      const local = getPreferencesSnapshot()
      const localDiffers =
        local.theme !== prefs.theme
        || local.accent !== prefs.accent
        || local.fontSize !== prefs.fontSize
        || local.notificationsMuted !== prefs.notificationsMuted
        || local.notificationVolume !== prefs.notificationVolume

      if (!cached && isDefault && localDiffers) {
        await saveUserPreferencesToServer(local)
        applyPreferencesObject(local, { persistLocal: true })
        writeCache(userId, local)
        return local
      }

      applyPreferencesObject(prefs, { persistLocal: true })
      writeCache(userId, prefs)
      return prefs
    }
  } catch {
    // offline or migration pending — keep local/cache values
  }

  return cached
}

export async function saveUserPreferencesToServer(prefs = getPreferencesSnapshot()) {
  if (!isSignedIn()) return null

  const userId = localStorage.getItem('userId')
  writeCache(userId, prefs)

  const payload = {
    theme: prefs.theme,
    accent: prefs.accent,
    fontSize: prefs.fontSize,
    notificationsMuted: prefs.notificationsMuted,
    notificationVolume: prefs.notificationVolume
  }

  if (saveInFlight) return saveInFlight

  saveInFlight = (async () => {
    try {
      const res = await api.put('/Profile/me/preferences', payload)
      const normalized = normalizeServerPrefs(res.data)
      if (normalized) writeCache(userId, normalized)
      return normalized
    } catch {
      return null
    } finally {
      saveInFlight = null
    }
  })()

  return saveInFlight
}

export function scheduleSavePreferences() {
  if (!isSignedIn()) return
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    saveUserPreferencesToServer()
  }, 400)
}

export async function syncLocalPreferencesToServer() {
  if (!isSignedIn()) return null
  return saveUserPreferencesToServer(getPreferencesSnapshot())
}
