import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import IqadmsLogo from '../components/IqadmsLogo'

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--upshd-surface, #fff)', borderRadius: 16, padding: '2rem', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <IqadmsLogo size={48} wordmarkLayout="stack" />
        </div>
        <h1 style={{ margin: '0 0 0.5rem', color: '#7a0019', fontSize: '1.35rem' }}>Forgot password</h1>
        <p style={{ color: '#64748b', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
          Enter your email or username. An administrator will review your request and email you a reset link if approved.
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Email or username</label>
          <input
            required
            value={emailOrUsername}
            onChange={e => setEmailOrUsername(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '1rem', boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>}
          {message && <p style={{ color: '#16a34a', fontSize: '0.9rem' }}>{message}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: 'none', background: '#9e1b32', color: '#fff', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}
          >
            {loading ? 'Sending…' : 'Notify administrator'}
          </button>
        </form>
        <p style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <Link to="/login" style={{ color: '#9e1b32' }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
