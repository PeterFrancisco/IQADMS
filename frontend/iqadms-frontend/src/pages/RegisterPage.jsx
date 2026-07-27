import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { upshd } from '../theme/upshd'
import {
  authPageStyle,
  authCardStyle,
  authHeadingStyle,
  authPrimaryButtonStyle,
  authOutlineButtonStyle,
  authInputStyle
} from '../theme/pageStyles'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleContinue = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.get(`/Auth/check-email?email=${email}`)

      if (!res.data.allowed) {
        setError('This email is not yet authorized.')
        return
      }

      if (res.data.alreadyRegistered) {
        setError('This email already has an account.')
        return
      }

      sessionStorage.setItem('verifiedEmail', email)
      navigate('/complete-registration')
    } catch {
      setError('Unable to verify email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={handleContinue} style={cardStyle}>
        <h1 style={authHeadingStyle}>Register</h1>
        <p style={{ color: '#64748b' }}>
          Enter your institutional email address.
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="yourname@school.edu"
          required
          style={inputStyle}
        />

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Checking...' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/request-access')}
          style={secondaryButtonStyle}
        >
          Request Access
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          style={linkButtonStyle}
        >
          Back to Login
        </button>
      </form>
    </div>
  )
}

const pageStyle = authPageStyle

const cardStyle = {
  ...authCardStyle,
  maxWidth: '420px'
}

const inputStyle = {
  ...authInputStyle,
  marginTop: '0.5rem'
}

const buttonStyle = {
  ...authPrimaryButtonStyle,
  marginTop: '1rem'
}

const secondaryButtonStyle = {
  ...authOutlineButtonStyle
}

const linkButtonStyle = {
  width: '100%',
  marginTop: '0.5rem',
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer'
}

const errorStyle = {
  marginTop: '1rem',
  background: '#fee2e2',
  color: '#991b1b',
  padding: '0.75rem',
  borderRadius: '8px'
}