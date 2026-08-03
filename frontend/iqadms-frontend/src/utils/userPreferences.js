const STORAGE = {
  theme: 'iqadms-theme',
  fontSize: 'iqadms-font-size',
  muted: 'iqadms-notifications-muted'
}

export const THEMES = ['original', 'light', 'dark']
export const FONT_SIZES = ['small', 'medium', 'large']

export function getTheme() {
  const v = localStorage.getItem(STORAGE.theme)
  return THEMES.includes(v) ? v : 'original'
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE.theme, THEMES.includes(theme) ? theme : 'original')
  applyTheme()
}

export function getFontSize() {
  const v = localStorage.getItem(STORAGE.fontSize)
  return FONT_SIZES.includes(v) ? v : 'medium'
}

export function setFontSize(size) {
  localStorage.setItem(STORAGE.fontSize, FONT_SIZES.includes(size) ? size : 'medium')
  applyFontSize()
}

export function isNotificationsMuted() {
  return localStorage.getItem(STORAGE.muted) === 'true'
}

export function setNotificationsMuted(muted) {
  localStorage.setItem(STORAGE.muted, muted ? 'true' : 'false')
}

export function applyTheme() {
  const theme = getTheme()
  document.documentElement.setAttribute('data-theme', theme)
}

export function applyFontSize() {
  const size = getFontSize()
  document.documentElement.setAttribute('data-font-size', size)
}

export function applyUserPreferences() {
  applyTheme()
  applyFontSize()
}
