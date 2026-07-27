import { useEffect, useState } from 'react'
import api from '../services/api'
import DashboardLayout from '../components/DashboardLayout'
import { pageTitleStyle, tableHeadRowStyle } from '../theme/pageStyles'

export default function SettingsPage() {
  const [tab, setTab] = useState('accounts')
  const [requests, setRequests] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRequests = async () => {
    try {
      const res = await api.get('/Admin/account-requests')
      setRequests(res.data)
    } catch (err) {
      console.error(err)
      alert('Failed to load account requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    if (tab === 'feedback') loadFeedback()
  }, [tab])

  const loadFeedback = async () => {
    try {
      const res = await api.get('/Admin/feedback')
      setFeedback(res.data)
    } catch (err) {
      console.error(err)
      alert('Failed to load feedback.')
    }
  }

  const approveRequest = async (id) => {
    if (!window.confirm('Approve this request?')) return

    try {
      await api.post(`/Admin/account-requests/${id}/approve`)
      await loadRequests()
    } catch (err) {
      console.error(err)
      alert('Failed to approve request.')
    }
  }

  const rejectRequest = async (id) => {
    if (!window.confirm('Reject this request?')) return

    try {
      await api.post(`/Admin/account-requests/${id}/reject`)
      await loadRequests()
    } catch (err) {
      console.error(err)
      alert('Failed to reject request.')
    }
  }

  return (
    <DashboardLayout>
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, ...pageTitleStyle }}>Admin Settings</h1>
          <p style={{ color: '#64748b' }}>
            Account requests, bug reports, and user feedback.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <TabBtn active={tab === 'accounts'} onClick={() => setTab('accounts')}>Account requests</TabBtn>
            <TabBtn active={tab === 'feedback'} onClick={() => setTab('feedback')}>Bug & feedback</TabBtn>
          </div>
        </div>

        {tab === 'feedback' ? (
          <div style={panelStyle}>
            <h2 style={{ margin: '0 0 1rem' }}>Recent reports</h2>
            {feedback.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No feedback submitted yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
                {feedback.map(item => (
                  <li key={item.id} style={{ padding: '0.85rem', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <strong style={{ textTransform: 'capitalize' }}>{item.type}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.35rem 0' }}>
                      {item.displayName || item.username} (@{item.username})
                    </div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>{item.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
        <div style={panelStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}
          >
            <h2 style={{ margin: 0 }}>Account Requests</h2>

            <button
              onClick={loadRequests}
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

          {loading ? (
            <p>Loading requests...</p>
          ) : requests.length === 0 ? (
            <p>No account requests found.</p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr style={tableHeadRowStyle}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Requested</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '600' }}>{req.fullName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {req.position}
                      </div>
                    </td>

                    <td style={tdStyle}>{req.email}</td>

                    <td style={tdStyle}>{req.department}</td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '0.3rem 0.7rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          color: 'white',
                          background:
                            req.status === 'Approved'
                              ? '#16a34a'
                              : req.status === 'Rejected'
                              ? '#dc2626'
                              : '#f59e0b'
                        }}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      {new Date(req.requestedAt).toLocaleString()}
                    </td>

                    <td style={tdStyle}>
                      {req.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => approveRequest(req.id)}
                            style={{
                              padding: '0.45rem 0.8rem',
                              border: 'none',
                              borderRadius: '8px',
                              background: '#16a34a',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => rejectRequest(req.id)}
                            style={{
                              padding: '0.45rem 0.8rem',
                              border: 'none',
                              borderRadius: '8px',
                              background: '#dc2626',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b' }}>Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 999,
        border: active ? 'none' : '1px solid #cbd5e1',
        background: active ? '#7a0019' : '#fff',
        color: active ? '#fff' : '#475569',
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  )
}

const panelStyle = {
  background: 'white',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem',
  borderBottom: '1px solid #d1d5db',
  fontWeight: '700'
}

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid #e5e7eb',
  verticalAlign: 'top'
}