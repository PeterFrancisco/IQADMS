import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

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
        <h1 style={{ marginTop: 0, color: '#1e3a8a' }}>Register</h1>
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
  maxWidth: '420px',
  background: 'white',
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
}

const inputStyle = {
  width: '100%',
  padding: '0.9rem',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  marginTop: '0.5rem',
  boxSizing: 'border-box'
}

const buttonStyle = {
  width: '100%',
  marginTop: '1rem',
  padding: '0.9rem',
  border: 'none',
  borderRadius: '10px',
  background: '#2563eb',
  color: 'white',
  fontWeight: '700',
  cursor: 'pointer'
}

const secondaryButtonStyle = {
  width: '100%',
  marginTop: '0.75rem',
  padding: '0.9rem',
  border: '1px solid #2563eb',
  borderRadius: '10px',
  background: 'white',
  color: '#2563eb',
  fontWeight: '700',
  cursor: 'pointer'
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