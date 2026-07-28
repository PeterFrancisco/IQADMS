import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { pageTitleStyle, sectionTitleStyle, tableHeadRowStyle, primaryButtonStyle } from '../theme/pageStyles'

export default function AdminAddAccountPage() {
  const [email, setEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [allowedUsers, setAllowedUsers] = useState([])

  useEffect(() => {
    loadAllowedUsers()
  }, [])

  const loadAllowedUsers = async () => {
    try {
      const res = await api.get('/Admin/allowed-users')
      setAllowedUsers(res.data)
    } catch (err) {
      console.error(err)
      alert('Failed to load allowed users.')
    }
  }

  const handleAdd = async e => {
    e.preventDefault()

    if (!email.trim()) return

    setLoading(true)

    try {
      const res = await api.post('/Admin/allowed-users', {
        email,
        isAdmin
      })

      const data = res.data || {}
      if (data.inviteEmailSent) {
        alert(data.message || 'User added. Invitation email sent.')
      } else if (data.inviteEmailError) {
        alert(
          `${data.message || 'User added.'}\n\nEmail: ${data.inviteEmailError}`
        )
      } else {
        alert(data.message || 'Allowed user added successfully.')
      }

      setEmail('')
      setIsAdmin(false)

      loadAllowedUsers()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to add allowed user.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'grid', gap: '1.5rem' }}>

        {/* Add account card */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <h1 style={pageTitleStyle}>
            Add Account
          </h1>

          <p style={{ color: '#64748b' }}>
            Add an email to the allowed registration list. An invitation is sent to that address (Gmail, Outlook, etc.) with a link to register.
          </p>

          <form
            onSubmit={handleAdd}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '1rem',
              alignItems: 'end'
            }}
          >
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@school.edu"
                required
                style={inputStyle}
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  color: '#374151',
                  fontWeight: '600'
                }}
              >
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={e => setIsAdmin(e.target.checked)}
                />
                Grant administrator privileges after registration
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={primaryButton}
            >
              {loading ? 'Adding...' : 'Add Email'}
            </button>
          </form>
        </div>

        {/* Allowed users table */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}
          >
            <h2 style={{ margin: 0, ...sectionTitleStyle }}>Allowed Users</h2>

            <button
              onClick={loadAllowedUsers}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}
          >
            <thead>
              <tr style={tableHeadRowStyle}>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>

            <tbody>
              {allowedUsers.map(user => (
                <tr key={user.id}>
                  <td style={tdStyle}>{user.email}</td>

                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.85rem',
                        color: 'white',
                        background: user.isRegistered ? '#16a34a' : '#f59e0b'
                      }}
                    >
                      {user.isRegistered ? 'Registered' : 'Pending Registration'}
                    </span>
                  </td>
                </tr>
              ))}

              {allowedUsers.length === 0 && (
                <tr>
                  <td colSpan="2" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                    No allowed users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}

const labelStyle = {
  display: 'block',
  marginBottom: '0.45rem',
  fontWeight: '600',
  color: '#374151'
}

const inputStyle = {
  width: '100%',
  padding: '0.85rem',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  outline: 'none',
  fontSize: '1rem',
  boxSizing: 'border-box'
}

const primaryButton = {
  ...primaryButtonStyle,
  minWidth: '140px'
}

const thStyle = {
  textAlign: 'left',
  padding: '0.85rem',
  borderBottom: '1px solid #d1d5db'
}

const tdStyle = {
  padding: '0.85rem',
  borderBottom: '1px solid #e5e7eb'
}