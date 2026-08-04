import api from '../services/api'
import { isSignedIn } from './authSession'

const STORAGE = {
  theme: 'iqadms-theme',
  accent: 'iqadms-accent',
  fontSize: 'iqadms-font-size',
  muted: 'iqadms-notifications-muted'
}

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
  return {
    theme: THEMES.includes(theme) ? theme : 'original',
    accent: ACCENTS.includes(accent) ? accent : 'maroon',
    fontSize: FONT_SIZES.includes(fontSize) ? fontSize : 'medium',
    notificationsMuted: Boolean(muted)
  }
}

export function getPreferencesSnapshot() {
  return {
    theme: getTheme(),
    accent: getAccent(),
    fontSize: getFontSize(),
    notificationsMuted: isNotificationsMuted()
  }
}

function applyPreferencesObject(prefs, { persistLocal = true } = {}) {
  if (!prefs) return
  if (persistLocal) {
    localStorage.setItem(STORAGE.theme, prefs.theme)
    localStorage.setItem(STORAGE.accent, prefs.accent)
    localStorage.setItem(STORAGE.fontSize, prefs.fontSize)
    localStorage.setItem(STORAGE.muted, prefs.notificationsMuted ? 'true' : 'false')
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
      const local = getPreferencesSnapshot()
      const localDiffers =
        local.theme !== prefs.theme
        || local.accent !== prefs.accent
        || local.fontSize !== prefs.fontSize
        || local.notificationsMuted !== prefs.notificationsMuted

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
    notificationsMuted: prefs.notificationsMuted
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
