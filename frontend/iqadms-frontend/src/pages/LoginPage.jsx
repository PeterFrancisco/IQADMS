import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import { upshd } from '../theme/upshd'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/Auth/login', {
        usernameOrEmail: username,
        password
      })

      

      // Save JWT token
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('username', username)
      localStorage.setItem('isAdmin', response.data.isAdmin)
      localStorage.setItem('userId', response.data.userId)

      navigate('/')
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
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, color: '#7a0019' }}>IQADMS</h1>
          <p style={{ color: '#64748b' }}>
            Planning and Quality Assurance Department
          </p>
          <p style={{ color: upshd.maroonLight, fontSize: '0.85rem', marginTop: '0.25rem' }}>
            UPSHD · Molino Campus
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
            fontSize: '0.9rem'
          }}
        >
          <span style={{ color: '#64748b' }}>
            Authorized PQAD users only
          </span>

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