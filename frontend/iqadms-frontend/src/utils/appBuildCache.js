const BUILD_KEY = 'iqadms_app_build'

/**
 * After deploy, Vite embeds a new build id. Reload once so browsers pick up fresh JS/CSS
 * (works with nginx no-cache on index.html + long cache on /assets).
 */
export function ensureLatestAppShell() {
  if (typeof window === 'undefined') return

  const buildId = typeof __IQADMS_BUILD__ !== 'undefined' ? __IQADMS_BUILD__ : ''
  if (!buildId) return

  const prev = localStorage.getItem(BUILD_KEY)
  if (!prev) {
    localStorage.setItem(BUILD_KEY, buildId)
    return
  }

  if (prev === buildId) return

  if (sessionStorage.getItem('iqadms_build_reload') === buildId) {
    localStorage.setItem(BUILD_KEY, buildId)
    return
  }

  sessionStorage.setItem('iqadms_build_reload', buildId)
  localStorage.setItem(BUILD_KEY, buildId)
  window.location.reload()
}
