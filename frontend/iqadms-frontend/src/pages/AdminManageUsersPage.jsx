import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { pageTitleStyle, sectionTitleStyle, tableHeadRowStyle } from '../theme/pageStyles'

export default function AdminManageUsersPage() {
  const [users, setUsers] = useState([])
  const [allowedUsers, setAllowedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      setLoading(true)
      setError('')

      const [usersRes, allowedRes] = await Promise.allSettled([
        api.get('/Admin/users'),
        api.get('/Admin/allowed-users')
      ])

      let errorMsg = ''

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data)
      } else {
        const status = usersRes.reason?.response?.status
        errorMsg = status === 403
          ? 'Your account is not an administrator in the database. Log out and log in again after IsAdmin is set to true.'
          : 'Failed to load registered users.'
      }

      if (allowedRes.status === 'fulfilled') {
        setAllowedUsers(allowedRes.value.data)
      } else if (!errorMsg) {
        errorMsg = 'Failed to load allowed emails.'
      }

      setError(errorMsg)
    } catch (err) {
      console.error(err)
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  async function removeUser(id, username) {
    if (!confirm(`Remove user "${username}"? They will lose access.`)) return

    try {
      await api.delete(`/Admin/users/${id}`)
      alert('User removed.')
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove user.')
    }
  }

  async function removeAllowedUser(id, email) {
    if (!confirm(`Remove allowed email "${email}"?`)) return

    try {
      await api.delete(`/Admin/allowed-users/${id}`)
      alert('Allowed email removed.')
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove allowed email.')
    }
  }

  async function resendInvite(id, email) {
    try {
      const res = await api.post(`/Admin/allowed-users/${id}/resend-invite`)
      const data = res.data || {}
      if (data.inviteEmailSent) {
        alert(`Invitation sent to ${email}.`)
      } else {
        alert(`${data.message || 'Send failed.'}\n\n${data.inviteEmailError || ''}`)
      }
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.inviteEmailError || 'Failed to resend invite.')
    }
  }

  async function resendAllPending() {
    const pending = allowedUsers.filter(u => !u.isRegistered)
    if (pending.length === 0) {
      alert('No pending emails.')
      return
    }
    if (!confirm(`Resend registration invites to ${pending.length} pending email(s)?`)) return

    try {
      const res = await api.post('/Admin/allowed-users/resend-pending-invites')
      alert(res.data?.message || 'Done.')
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resend invites.')
    }
  }

  function inviteLabel(item) {
    if (item.isRegistered) return '—'
    if (item.lastInviteError) return 'Failed'
    if (item.lastInviteSentAt) return 'Sent'
    return 'Not sent'
  }

  function inviteColor(item) {
    if (item.isRegistered) return '#94a3b8'
    if (item.lastInviteError) return '#dc2626'
    if (item.lastInviteSentAt) return '#16a34a'
    return '#f59e0b'
  }

  const currentUsername = localStorage.getItem('username')

  return (
    <DashboardLayout>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <h1 style={pageTitleStyle}>Manage Users</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Remove registered users or pending allowed emails.</p>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* Registered users */}
            <Section title="Registered Users">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={tableHeadRowStyle}>
                    <th style={thStyle}>Username</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Position</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={tdStyle}>{user.username}</td>
                      <td style={tdStyle}>{user.email}</td>
                      <td style={tdStyle}>{user.position || '-'}</td>
                      <td style={tdStyle}>{user.isAdmin ? 'Admin' : 'User'}</td>
                      <td style={tdStyle}>
                        <Badge
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? '#16a34a' : '#94a3b8'}
                        />
                      </td>
                      <td style={tdStyle}>
                        {user.username === currentUsername ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>You</span>
                        ) : (
                          <button
                            onClick={() => removeUser(user.id, user.username)}
                            style={dangerBtn}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>

            {/* Allowed emails (not registered yet) */}
            <Section title="Allowed Emails (Pending Registration)">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                <button type="button" onClick={resendAllPending} style={secondaryBtn}>
                  Resend all pending invites
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={tableHeadRowStyle}>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Admin?</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Invite</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allowedUsers.map(item => (
                    <tr key={item.id}>
                      <td style={tdStyle}>{item.email}</td>
                      <td style={tdStyle}>{item.isAdmin ? 'Yes' : 'No'}</td>
                      <td style={tdStyle}>
                        <Badge
                          label={item.isRegistered ? 'Registered' : 'Pending'}
                          color={item.isRegistered ? '#16a34a' : '#f59e0b'}
                        />
                      </td>
                      <td style={tdStyle}>
                        {!item.isRegistered ? (
                          <span title={item.lastInviteError || ''}>
                            <Badge label={inviteLabel(item)} color={inviteColor(item)} />
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {item.isRegistered ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Use table above</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => resendInvite(item.id, item.email)}
                              style={secondaryBtn}
                            >
                              Resend invite
                            </button>
                            <button
                              onClick={() => removeAllowedUser(item.id, item.email)}
                              style={dangerBtn}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {allowedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                        No allowed emails.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </div>
  )
}

function Badge({ label, color }) {
  return (
    <span style={{
      padding: '0.3rem 0.75rem',
      borderRadius: 999,
      fontSize: '0.85rem',
      color: '#fff',
      background: color,
      fontWeight: 600
    }}>
      {label}
    </span>
  )
}

const thStyle = { textAlign: 'left', padding: '0.85rem', borderBottom: '1px solid #d1d5db' }
const tdStyle = { padding: '0.85rem', borderBottom: '1px solid #e5e7eb' }
const dangerBtn = {
  padding: '0.45rem 0.85rem',
  border: 'none',
  borderRadius: 8,
  background: '#dc2626',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600
}
const secondaryBtn = {
  padding: '0.45rem 0.85rem',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#1e293b',
  cursor: 'pointer',
  fontWeight: 600
}