/** Extract a user-facing message from an axios error response. */
export function getApiErrorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data
  if (!data) return fallback

  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail
  }

  if (data.errors && typeof data.errors === 'object') {
    for (const value of Object.values(data.errors)) {
      const msg = Array.isArray(value) ? value[0] : value
      if (typeof msg === 'string' && msg.trim()) return msg
    }
  }

  if (typeof data.title === 'string' && data.title !== 'One or more validation errors occurred.') {
    return data.title
  }

  return fallback
}

export function validateStrongPassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.'
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.'
  }
  return null
}
