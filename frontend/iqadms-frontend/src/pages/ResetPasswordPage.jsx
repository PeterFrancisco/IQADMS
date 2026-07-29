import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import IqadmsLogo from '../components/IqadmsLogo'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''

  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.post('/Auth/reset-password', {
        token: token.trim(),
        password,
        confirmPassword
      })
      setMessage(res.data?.message || 'Password updated.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not reset password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <IqadmsLogo size={48} wordmarkLayout="stack" />
        </div>
        <h1 style={{ margin: '0 0 0.5rem', color: '#7a0019', fontSize: '1.35rem' }}>Set new password</h1>
        <p style={{ color: '#64748b', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
          Use the link from your administrator&apos;s email. Passwords must be at least 8 characters with upper, lower, number, and symbol.
        </p>
        <form onSubmit={handleSubmit}>
          {!tokenFromUrl && (
            <>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Reset token</label>
              <input
                required
                value={token}
                onChange={e => setToken(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '1rem', boxSizing: 'border-box' }}
              />
            </>
          )}
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>New password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '1rem', boxSizing: 'border-box' }}
          />
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Confirm password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '1rem', boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>}
          {message && <p style={{ color: '#16a34a', fontSize: '0.9rem' }}>{message}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: 'none', background: '#9e1b32', color: '#fff', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
        <p style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <Link to="/login" style={{ color: '#9e1b32' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
