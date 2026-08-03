import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import { readAuthTokenFromResponse } from '../utils/authToken'
import { setPresence } from '../utils/presenceApi'
import { setRememberMe, persistAuthToken } from '../utils/authSession'
import { startSessionKeepAlive } from '../services/api'
import IqadmsLogo from '../components/IqadmsLogo'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMeChecked] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()

  const navigate = useNavigate()
  const sessionExpired = searchParams.get('session') === 'expired'
  const nextPath = searchParams.get('next')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/Auth/login', {
        usernameOrEmail: username,
        password,
        rememberMe
      })

      const token = readAuthTokenFromResponse(response.data)
      if (!token) {
        const hint =
          typeof response.data === 'string' && response.data.includes('<!DOCTYPE')
            ? ' The server returned a web page instead of JSON — check that /api is proxied to the API (port 5135), not the frontend.'
            : ''
        setError(
          `Sign-in succeeded but no session token was returned.${hint} Contact your administrator.`
        )
        return
      }

      setRememberMe(rememberMe)
      persistAuthToken(token)

      let isAdmin = response.data.isAdmin === true
      try {
        const meRes = await api.get('/Profile/me')
        isAdmin = meRes.data.isAdmin === true
        if (meRes.data.username) {
          localStorage.setItem('username', meRes.data.username)
        } else {
          localStorage.setItem('username', username)
        }
        if (meRes.data.email) {
          localStorage.setItem('userEmail', meRes.data.email)
        }
      } catch {
        localStorage.setItem('username', username)
      }

      localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false')
      localStorage.setItem('userId', response.data.userId)

      try {
        await setPresence('online')
      } catch {
        // non-blocking if presence API unavailable before migration
      }

      startSessionKeepAlive()

      const safeNext =
        nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'
      navigate(safeNext)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid username/email or password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--upshd-bg, #f7f4f5)',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--upshd-surface, #fff)',
          borderRadius: '16px',
          padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <IqadmsLogo size={56} className="iqadms-logo--center" />
          </div>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0' }}>
            Planning and Quality Assurance Department
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMeChecked(e.target.checked)}
            />
            Keep me signed in (session cookie on this browser, like “Remember me”)
          </label>

          {sessionExpired && !error && (
            <div
              style={{
                background: '#fef3c7',
                color: '#92400e',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}
            >
              Your session expired. Please sign in again to continue.
            </div>
          )}

          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              border: 'none',
              borderRadius: '10px',
              background: '#7a0019',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a0019',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0
            }}
          >
            Forgot password?
          </button>

          <button
            type="button"
            onClick={() => navigate('/register')}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a0019',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  )
}
const inputStyle = {
  width: '100%',
  padding: '0.85rem',
  marginTop: '0.4rem',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  outline: 'none',
  fontSize: '1rem',
  boxSizing: 'border-box'
}