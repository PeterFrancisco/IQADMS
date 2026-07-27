import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage, validateStrongPassword } from '../utils/apiError'

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
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('username', username)
      localStorage.setItem('isAdmin', response.data.isAdmin)

      // Clear temporary email
      sessionStorage.removeItem('verifiedEmail')

      // Go directly to dashboard
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
        <h1 style={{ marginTop: 0, color: '#1e3a8a' }}>
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

const pageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: '#f5f7fb',
  padding: '2rem',
  fontFamily: 'Arial, sans-serif'
}

const cardStyle = {
  width: '100%',
  maxWidth: '460px',
  background: 'white',
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
}

const labelStyle = {
  display: 'block',
  marginBottom: '0.45rem',
  fontWeight: '600',
  color: '#374151'
}

const inputStyle = {
  width: '100%',
  padding: '0.9rem',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box'
}

const buttonStyle = {
  width: '100%',
  marginTop: '1.25rem',
  padding: '0.95rem',
  border: 'none',
  borderRadius: '10px',
  background: '#2563eb',
  color: 'white',
  fontWeight: '700',
  cursor: 'pointer'
}

const errorStyle = {
  marginTop: '1rem',
  background: '#fee2e2',
  color: '#991b1b',
  padding: '0.75rem',
  borderRadius: '8px'
}