/** @typedef {{ confirm: Function, prompt: Function, alert: Function }} DialogApi */

/** @type {DialogApi | null} */
let dialogApi = null

export function registerAppDialog(api) {
  dialogApi = api || null
}

function normalizeConfirm(options) {
  if (typeof options === 'string') return { message: options }
  return options
}

function normalizePrompt(options) {
  if (typeof options === 'string') return { message: options, label: 'Note', multiline: true }
  return options
}

export const appDialog = {
  confirm(options) {
    const opts = normalizeConfirm(options)
    if (!dialogApi) return Promise.resolve(false)
    return dialogApi.confirm(opts)
  },
  prompt(options) {
    const opts = normalizePrompt(options)
    if (!dialogApi) return Promise.resolve(null)
    return dialogApi.prompt(opts)
  },
  alert(options) {
    if (!dialogApi) {
      const msg = typeof options === 'string' ? options : options?.message
      if (msg) window.alert(msg)
      return Promise.resolve()
    }
    return dialogApi.alert(options)
  }
}
