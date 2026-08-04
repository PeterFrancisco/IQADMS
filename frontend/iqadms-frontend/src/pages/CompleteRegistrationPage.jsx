import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage, validateStrongPassword } from '../utils/apiError'
import { readAuthTokenFromResponse } from '../utils/authToken'
import { completeLoginSession } from '../utils/loginSession'
import {
  authPageStyle,
  authCardStyle,
  authHeadingStyle,
  authPrimaryButtonStyle,
  authInputStyle
} from '../theme/pageStyles'

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

      // Save login session
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
    <div style={pageStyle}>
      <form onSubmit={handleRegister} style={cardStyle}>
        <h1 style={authHeadingStyle}>
          Create Your Account
        </h1>

        <p style={{ color: '#64748b' }}>
          Email verified: <strong>{email}</strong>
        </p>

        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e5e7eb'
          }}
        >
          <strong>Password requirements</strong>
          <ul style={{ margin: '0.5rem 0 0 1rem', color: '#475569' }}>
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </div>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

const pageStyle = authPageStyle

const cardStyle = authCardStyle

const labelStyle = {
  display: 'block',
  marginBottom: '0.45rem',
  fontWeight: '600',
  color: '#374151'
}

const inputStyle = authInputStyle

const buttonStyle = {
  ...authPrimaryButtonStyle,
  marginTop: '1.25rem',
  padding: '0.95rem'
}

const errorStyle = {
  marginTop: '1rem',
  background: '#fee2e2',
  color: '#991b1b',
  padding: '0.75rem',
  borderRadius: '8px'
}