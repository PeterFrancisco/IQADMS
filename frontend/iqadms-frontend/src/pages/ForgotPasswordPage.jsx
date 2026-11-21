import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import IqadmsLogo from '../components/IqadmsLogo'
import './login-page.css'

export default function ForgotPasswordPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.post('/Auth/forgot-password', { emailOrUsername: emailOrUsername.trim() })
      setMessage(res.data?.message || 'Request submitted.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not submit request.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <IqadmsLogo size={48} className="iqadms-logo--center" />
          </div>
          <h1 style={{ margin: 0, color: 'var(--upshd-page-heading, var(--upshd-maroon))', fontSize: '1.35rem' }}>
            Forgot password
          </h1>
          <p className="auth-text" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Enter your email or username. Administrators are notified by email and in the app; you will receive a reset link after approval.
          </p>
        </div>

        <div className="login-notice login-notice--info">
          <strong>Email delivery</strong>
          <p>
            Reset messages are sent from <strong>iqadms.pqad@gmail.com</strong>. Add this address to your safe senders or contacts so it is not blocked or sent to spam.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>
              Email or username
              <input
                required
                className="login-input"
                value={emailOrUsername}
                onChange={e => setEmailOrUsername(e.target.value)}
              />
            </label>
          </div>
          {error && <div className="login-alert login-alert--error">{error}</div>}
          {message && <div className="login-alert" style={{ background: '#dcfce7', color: '#166534' }}>{message}</div>}
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? 'Sending…' : 'Notify administrator'}
          </button>
        </form>

        <p className="auth-text auth-text-center" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
          <Link to="/login" className="auth-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
