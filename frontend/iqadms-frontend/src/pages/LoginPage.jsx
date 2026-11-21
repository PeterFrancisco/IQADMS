import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import { setRememberMe } from '../utils/authSession'
import { activateSavedAccountSession, finishPasswordLogin } from '../utils/loginSession'
import {
  readSavedAccounts,
  removeSavedAccount,
  snapshotCurrentAccount,
  upsertSavedAccount
} from '../utils/savedAccounts'
import IqadmsLogo from '../components/IqadmsLogo'
import './login-page.css'

function accountLabel(account) {
  return account.displayName || account.username || 'Account'
}

function resolveAvatarUrl(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const base = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || ''
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMeChecked] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickUserId, setQuickUserId] = useState('')
  const [savedAccounts, setSavedAccounts] = useState([])
  const [searchParams] = useSearchParams()

  const navigate = useNavigate()
  const sessionExpired = searchParams.get('session') === 'expired'
  const nextPath = searchParams.get('next')

  useEffect(() => {
    setSavedAccounts(readSavedAccounts())
  }, [])

  const safeNext =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'

  const handleQuickSignIn = async account => {
    setError('')
    setQuickUserId(account.userId)
    setLoading(true)

    try {
      const current = snapshotCurrentAccount()
      if (current && current.userId !== account.userId) {
        upsertSavedAccount(current)
      }

      await activateSavedAccountSession(account)
      window.location.assign(safeNext)
    } catch (err) {
      setUsername(account.username || '')
      setError(getApiErrorMessage(err, 'Session expired. Sign in with your password.'))
      removeSavedAccount(account.userId)
      setSavedAccounts(readSavedAccounts())
    } finally {
      setLoading(false)
      setQuickUserId('')
    }
  }

  const handleRemoveSaved = (e, userId) => {
    e.stopPropagation()
    removeSavedAccount(userId)
    setSavedAccounts(readSavedAccounts())
  }

  const handleLogin = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/Auth/login', {
        usernameOrEmail: username,
        password,
        rememberMe
      })

      setRememberMe(rememberMe)
      await finishPasswordLogin(response.data, username, rememberMe)
      navigate(safeNext)
    } catch (err) {
      const hint =
        typeof err?.response?.data === 'string' && err.response.data.includes('<!DOCTYPE')
          ? ' The server returned a web page instead of JSON. Check that /api is proxied to the API (port 5135), not the frontend.'
          : ''
      setError(getApiErrorMessage(err, `Invalid username/email or password.${hint}`))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <IqadmsLogo size={56} className="iqadms-logo--center" />
          </div>
          <p>Planning and Quality Assurance Department</p>
        </div>

        {savedAccounts.length > 0 && (
          <section className="login-saved-section" aria-label="Saved accounts">
            <p className="login-saved-title">Continue as</p>
            <div className="login-saved-list">
              {savedAccounts.map(account => {
                const label = accountLabel(account)
                const initials = label.slice(0, 2).toUpperCase()
                const avatarUrl = resolveAvatarUrl(account.profilePictureUrl)
                const busy = loading && quickUserId === account.userId

                return (
                  <button
                    key={account.userId}
                    type="button"
                    className="login-saved-account"
                    onClick={() => handleQuickSignIn(account)}
                    disabled={loading}
                    aria-busy={busy}
                  >
                    <span className="login-saved-avatar" aria-hidden>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" />
                      ) : (
                        initials
                      )}
                    </span>
                    <span className="login-saved-meta">
                      <strong>{label}</strong>
                      <small>{account.email || account.username}</small>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="login-saved-remove"
                      title="Remove from this device"
                      aria-label={`Remove ${label} from this device`}
                      onClick={e => handleRemoveSaved(e, account.userId)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRemoveSaved(e, account.userId)
                        }
                      }}
                    >
                      ×
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="login-divider">or sign in</div>
          </section>
        )}

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              className="login-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMeChecked(e.target.checked)}
            />
            Keep me signed in (session cookie on this browser, like “Remember me”)
          </label>

          {sessionExpired && !error && (
            <div className="login-alert login-alert--warn">
              Your session expired. Please sign in again to continue.
            </div>
          )}

          {error && <div className="login-alert login-alert--error">{error}</div>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading && !quickUserId ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <button type="button" onClick={() => navigate('/forgot-password')}>
            Forgot password?
          </button>
          <button type="button" className="login-register" onClick={() => navigate('/register')}>
            Register
          </button>
        </div>
      </div>
    </div>
  )
}
