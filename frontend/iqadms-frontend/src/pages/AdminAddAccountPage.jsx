import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { pageTitleStyle, sectionTitleStyle, tableHeadRowStyle, primaryButtonStyle } from '../theme/pageStyles'
import { appDialog } from '../utils/appDialog'


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
      await appDialog.alert('Failed to load allowed users.')
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
        await appDialog.alert(data.message || 'User added. Invitation email sent.')
      } else if (data.inviteEmailError) {
        await appDialog.alert(
          `${data.message || 'User added.'}\n\nEmail: ${data.inviteEmailError}`
        )
      } else {
        await appDialog.alert(data.message || 'Allowed user added successfully.')
      }

      setEmail('')
      setIsAdmin(false)

      loadAllowedUsers()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to add allowed user.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestSmtp = async () => {
    try {
      const res = await api.post('/Admin/test-smtp')
      await appDialog.alert(res.data?.message || 'Test email sent.')
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.inviteEmailError ||
        'SMTP test failed.'
      await appDialog.alert(msg)
    }
  }

  const handleTestRegistrationInvite = async () => {
    try {
      const res = await api.post('/Admin/test-registration-invite')
      const links = res.data?.links
      const extra = links
        ? `\n\nRegister link:\n${links.registerUrl}\n\nSite:\n${links.publicUrl}`
        : ''
      await appDialog.alert((res.data?.message || 'Sample invite sent.') + extra)
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.inviteEmailError ||
        'Sample invite failed.'
      await appDialog.alert(msg)
    }
  }

  const handleTestTaskAssignedEmail = async () => {
    const to = await appDialog.prompt({
      title: 'Test task notification',
      message:
        'Enter the Outlook (or other) address that should receive a task assignment email. Subject: IQADMS — New task assigned.',
      defaultValue: ''
    })
    if (!to?.trim()) return

    try {
      const res = await api.post('/Admin/test-task-assigned-email', null, {
        params: { to: to.trim() }
      })
      await appDialog.alert(res.data?.message || 'Sample task notification sent.')
    } catch (err) {
      await appDialog.alert(
        err.response?.data?.message || 'Task notification test failed.'
      )
    }
  }

  async function resendInvite(id, addr) {
    try {
      const res = await api.post(`/Admin/allowed-users/${id}/resend-invite`)
      const data = res.data || {}
      if (data.inviteEmailSent) {
        await appDialog.alert(`Invitation sent to ${addr}.`)
      } else {
        await appDialog.alert(`${data.message || 'Send failed.'}\n\n${data.inviteEmailError || ''}`)
      }
      loadAllowedUsers()
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || err.response?.data?.inviteEmailError || 'Failed to resend invite.')
    }
  }

  async function resendAllPending() {
    const pending = allowedUsers.filter(u => !u.isRegistered)
    if (pending.length === 0) {
      await appDialog.alert('No pending emails.')
      return
    }
    if (!confirm(`Resend registration invites to ${pending.length} pending email(s)?`)) return
    try {
      const res = await api.post('/Admin/allowed-users/resend-pending-invites')
      await appDialog.alert(res.data?.message || 'Done.')
      loadAllowedUsers()
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to resend invites.')
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

          <button
            type="button"
            onClick={handleTestSmtp}
            style={{
              marginTop: '1rem',
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Send test email (SMTP check)
          </button>

          <button
            type="button"
            onClick={handleTestRegistrationInvite}
            style={{
              marginTop: '0.5rem',
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Send sample registration invite (to admin email)
          </button>

          <button
            type="button"
            onClick={handleTestTaskAssignedEmail}
            style={{
              marginTop: '0.5rem',
              background: '#fdf2f4',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: '#7a0019',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Send sample task notification (choose email)
          </button>

          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
            Task emails are sent when you assign someone else on a task — not when you use the registration invite buttons above.
          </p>
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

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={resendAllPending}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Resend pending
              </button>
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
                <th style={thStyle}>Invite</th>
                <th style={thStyle}>Action</th>
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

                  <td style={tdStyle}>
                    {user.isRegistered ? (
                      '—'
                    ) : (
                      <span
                        title={user.lastInviteError || ''}
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: user.lastInviteError
                            ? '#dc2626'
                            : user.lastInviteSentAt
                              ? '#16a34a'
                              : '#f59e0b'
                        }}
                      >
                        {user.lastInviteError
                          ? 'Failed'
                          : user.lastInviteSentAt
                            ? 'Sent'
                            : 'Not sent'}
                      </span>
                    )}
                  </td>

                  <td style={tdStyle}>
                    {!user.isRegistered && (
                      <button
                        type="button"
                        onClick={() => resendInvite(user.id, user.email)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Resend invite
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {allowedUsers.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
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