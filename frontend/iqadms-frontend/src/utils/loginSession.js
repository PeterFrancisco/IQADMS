import api, { refreshSessionToken, startSessionKeepAlive } from '../services/api'
import { persistAuthToken, setRememberMe } from './authSession'
import { readAuthTokenFromResponse } from './authToken'
import { setPresence } from './presenceApi'
import { persistCurrentAccountSnapshot, activateSavedAccount, snapshotCurrentAccount, upsertSavedAccount } from './savedAccounts'
import { loadUserPreferencesFromServer, syncLocalPreferencesToServer } from './userPreferences'

export async function completeLoginSession({
  token,
  userId,
  username,
  isAdmin,
  rememberMe,
  profile = null
}) {
  if (!token) {
    throw new Error('No session token')
  }

  setRememberMe(rememberMe !== false)
  persistAuthToken(token)

  if (userId) localStorage.setItem('userId', String(userId))
  if (username) localStorage.setItem('username', username)
  localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false')

  let me = profile
  if (!me) {
    try {
      const meRes = await api.get('/Profile/me')
      me = meRes.data
    } catch {
      me = null
    }
  }

  if (me) {
    if (me.username) localStorage.setItem('username', me.username)
    if (me.email) localStorage.setItem('userEmail', me.email)
    if (typeof me.isAdmin === 'boolean') {
      localStorage.setItem('isAdmin', me.isAdmin ? 'true' : 'false')
    }
  }

  persistCurrentAccountSnapshot(me)
  await loadUserPreferencesFromServer()
  startSessionKeepAlive()

  try {
    await setPresence('online')
  } catch {
    // non-blocking
  }

  return me
}

export async function activateSavedAccountSession(account) {
  activateSavedAccount(account)

  const refreshed = await refreshSessionToken()
  if (!refreshed) {
    throw new Error('Session expired. Sign in with your password.')
  }

  let me = null
  try {
    const meRes = await api.get('/Profile/me')
    me = meRes.data
    if (me?.username) localStorage.setItem('username', me.username)
    if (me?.email) localStorage.setItem('userEmail', me.email)
    if (typeof me?.isAdmin === 'boolean') {
      localStorage.setItem('isAdmin', me.isAdmin ? 'true' : 'false')
    }
  } catch {
    // keep saved account metadata
  }

  persistCurrentAccountSnapshot(me || account)
  await loadUserPreferencesFromServer()
  startSessionKeepAlive()

  try {
    await setPresence('online')
  } catch {
    // non-blocking
  }

  return me
}

export async function finishPasswordLogin(responseData, username, rememberMe) {
  const token = readAuthTokenFromResponse(responseData)
  if (!token) {
    throw new Error('Sign-in succeeded but no session token was returned.')
  }

  return completeLoginSession({
    token,
    userId: responseData.userId,
    username,
    isAdmin: responseData.isAdmin === true,
    rememberMe
  })
}

export async function prepareForAnotherAccount() {
  const current = snapshotCurrentAccount()
  if (current) upsertSavedAccount(current)

  try {
    await setPresence('offline')
  } catch {
    // ignore
  }

  try {
    await syncLocalPreferencesToServer()
  } catch {
    // ignore
  }
}
