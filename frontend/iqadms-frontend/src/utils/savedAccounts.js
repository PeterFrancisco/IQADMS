import {
  getRememberMe,
  persistAuthToken,
  readAuthToken,
  setRememberMe
} from './authSession'

const STORAGE_KEY = 'iqadms_saved_accounts'
const MAX_ACCOUNTS = 8

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)))
}

export function getCurrentUserId() {
  return localStorage.getItem('userId') || ''
}

export function readSavedAccounts() {
  return readRaw()
    .filter(a => a?.userId && a?.token)
    .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
}

export function getSavedAccount(userId) {
  return readSavedAccounts().find(a => a.userId === userId) || null
}

export function upsertSavedAccount(account) {
  if (!account?.userId || !account?.token) return

  const entry = {
    userId: String(account.userId),
    username: account.username || '',
    displayName: account.displayName || account.username || '',
    email: account.email || '',
    isAdmin: account.isAdmin === true,
    profilePictureUrl: account.profilePictureUrl || null,
    token: account.token,
    rememberMe: account.rememberMe !== false,
    lastUsedAt: account.lastUsedAt || Date.now()
  }

  const rest = readRaw().filter(a => a.userId !== entry.userId)
  writeRaw([entry, ...rest])
}

export function removeSavedAccount(userId) {
  writeRaw(readRaw().filter(a => a.userId !== userId))
}

export function snapshotCurrentAccount() {
  const token = readAuthToken()
  const userId = getCurrentUserId()
  if (!token || !userId) return null

  return {
    userId,
    username: localStorage.getItem('username') || '',
    displayName: localStorage.getItem('iqadmsDisplayName') || localStorage.getItem('username') || '',
    email: localStorage.getItem('userEmail') || '',
    isAdmin: localStorage.getItem('isAdmin') === 'true',
    profilePictureUrl: localStorage.getItem('iqadmsProfilePictureUrl') || null,
    token,
    rememberMe: getRememberMe(),
    lastUsedAt: Date.now()
  }
}

export function persistCurrentAccountSnapshot(profile = null) {
  const token = readAuthToken()
  const userId = getCurrentUserId()
  if (!token || !userId) return

  upsertSavedAccount({
    userId,
    username: profile?.username || localStorage.getItem('username') || '',
    displayName: profile?.displayName || localStorage.getItem('username') || '',
    email: profile?.email || localStorage.getItem('userEmail') || '',
    isAdmin: profile?.isAdmin === true || localStorage.getItem('isAdmin') === 'true',
    profilePictureUrl: profile?.profilePictureUrl || null,
    token,
    rememberMe: getRememberMe(),
    lastUsedAt: Date.now()
  })

  if (profile?.displayName) {
    localStorage.setItem('iqadmsDisplayName', profile.displayName)
  }
  if (profile?.profilePictureUrl) {
    localStorage.setItem('iqadmsProfilePictureUrl', profile.profilePictureUrl)
  }
}

export function activateSavedAccount(account) {
  if (!account?.token || !account?.userId) {
    throw new Error('Invalid saved account')
  }

  persistAuthToken(account.token)
  localStorage.setItem('userId', account.userId)
  localStorage.setItem('username', account.username || '')
  localStorage.setItem('isAdmin', account.isAdmin ? 'true' : 'false')
  setRememberMe(account.rememberMe !== false)

  if (account.email) {
    localStorage.setItem('userEmail', account.email)
  } else {
    localStorage.removeItem('userEmail')
  }

  if (account.displayName) {
    localStorage.setItem('iqadmsDisplayName', account.displayName)
  }

  if (account.profilePictureUrl) {
    localStorage.setItem('iqadmsProfilePictureUrl', account.profilePictureUrl)
  } else {
    localStorage.removeItem('iqadmsProfilePictureUrl')
  }

  upsertSavedAccount({ ...account, lastUsedAt: Date.now() })
}

export function otherSavedAccounts(currentUserId = getCurrentUserId()) {
  return readSavedAccounts().filter(a => a.userId !== currentUserId)
}
