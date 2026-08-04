import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage, validateStrongPassword } from '../utils/apiError'
import { readAuthTokenFromResponse } from '../utils/authToken'
import { completeLoginSession } from '../utils/loginSession'
import HintButton from '../components/HintButton'
import IqadmsLogo from '../components/IqadmsLogo'
import './login-page.css'

export default function CompleteRegistrationPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const verifiedEmail = sessionStorage.getItem('verifiedEmail')

    if (!verifiedEmail) {
      navigate('/register')
      return
    }

    setEmail(verifiedEmail)
  }, [navigate])

  const handleRegister = async e => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const passwordIssue = validateStrongPassword(password)
    if (passwordIssue) {
      setError(passwordIssue)
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/Auth/register', {
        username,
        email,
        password,
        confirmPassword
      })

      const token = readAuthTokenFromResponse(response.data)
      if (!token) {
        setError('Registration succeeded but no session token was returned. Check /api proxy on the server.')
        return
      }

      await completeLoginSession({
        token,
        userId: response.data.userId,
        username,
        isAdmin: response.data.isAdmin === true,
        rememberMe: true
      })

      sessionStorage.removeItem('verifiedEmail')
      navigate('/')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Please check your details and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={handleRegister} className="login-card">
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <IqadmsLogo size={48} className="iqadms-logo--center" />
          </div>
          <h1 style={{ margin: 0, color: 'var(--upshd-page-heading, var(--upshd-maroon))' }}>Create your account</h1>
          <p className="auth-text" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Email verified: <strong>{email}</strong>
          </p>
        </div>

        <div className="login-field">
          <label>
            Username
            <input
              type="text"
              className="login-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="login-field">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Password</span>
            <HintButton title="Password requirements">
              <ul>
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character</li>
              </ul>
            </HintButton>
          </div>
          <input
            type="password"
            className="login-input"
            style={{ marginTop: 0 }}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="login-field">
          <label>
            Confirm password
            <input
              type="password"
              className="login-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </label>
        </div>

        {error && <div className="login-alert login-alert--error">{error}</div>}

        <button type="submit" disabled={loading} className="login-submit">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
