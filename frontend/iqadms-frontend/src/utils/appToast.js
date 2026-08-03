/** @typedef {'success' | 'error' | 'info' | 'notification'} ToastKind */

/**
 * @typedef {Object} ToastOptions
 * @property {string} [title]
 * @property {string} message
 * @property {ToastKind} [type]
 * @property {number} [duration]
 * @property {() => void} [onClick]
 * @property {string} [linkPath]
 * @property {boolean} [silent]
 */

/** @type {{ show: (opts: ToastOptions) => string, dismiss: (id: string) => void } | null} */
let toastApi = null

export function registerAppToast(api) {
  toastApi = api || null
}

function normalizeOptions(input) {
  if (typeof input === 'string') return { message: input, type: 'info' }
  return input
}

function show(options) {
  const opts = normalizeOptions(options)
  if (!toastApi) {
    if (opts.message) console.info('[toast]', opts.message)
    return ''
  }
  return toastApi.show(opts)
}

export const appToast = {
  show,
  success(message, extra = {}) {
    return show({ ...extra, message, type: 'success' })
  },
  error(message, extra = {}) {
    return show({ ...extra, message, type: 'error' })
  },
  info(message, extra = {}) {
    return show({ ...extra, message, type: 'info' })
  },
  notification({ title, message, body, linkPath, onClick, silent }) {
    return show({
      title,
      message: message || body || title || 'New notification',
      type: 'notification',
      linkPath,
      onClick,
      silent,
      duration: 4500
    })
  },
  dismiss(id) {
    toastApi?.dismiss(id)
  }
}
