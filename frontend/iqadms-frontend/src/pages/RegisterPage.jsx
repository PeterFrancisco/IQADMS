import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import IqadmsLogo from '../components/IqadmsLogo'
import './login-page.css'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleContinue = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const normalized = email.trim().toLowerCase()
      const res = await api.get(`/Auth/check-email?email=${encodeURIComponent(normalized)}`)

      if (!res.data.allowed) {
        setError('This email is not yet authorized.')
        return
      }

      if (res.data.alreadyRegistered) {
        setError('This email already has an account.')
        return
      }

      sessionStorage.setItem('verifiedEmail', normalized)
      navigate('/complete-registration')
    } catch (err) {
      if (!err?.response) {
        setError(
          'Cannot reach the server. Confirm the API is running and rebuild the frontend after pulling the latest code (hard refresh the page).'
        )
      } else {
        setError(getApiErrorMessage(err, 'Unable to verify email.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={handleContinue} className="login-card">
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <IqadmsLogo size={48} className="iqadms-logo--center" />
          </div>
          <h1 style={{ margin: 0, color: 'var(--upshd-page-heading, var(--upshd-maroon))' }}>Register</h1>
          <p className="auth-text" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Enter the institutional email address that PQAD approved for IQADMS access.
          </p>
        </div>

        <div className="login-field">
          <label>
            Email
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="yourname@school.edu"
              required
            />
          </label>
        </div>

        {error && <div className="login-alert login-alert--error">{error}</div>}

        <button type="submit" disabled={loading} className="login-submit">
          {loading ? 'Checking…' : 'Continue'}
        </button>

        <button type="button" onClick={() => navigate('/request-access')} className="auth-secondary-btn">
          Request access
        </button>

        <button type="button" onClick={() => navigate('/login')} className="auth-text-btn">
          Back to sign in
        </button>
      </form>
    </div>
  )
}
