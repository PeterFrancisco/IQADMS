import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { tableHeadRowStyle } from '../../theme/pageStyles'
import { appDialog } from '../../utils/appDialog'
import { AdminAddAccountContent } from '../../pages/AdminAddAccountPage'
import { AdminManageUsersContent } from '../../pages/AdminManageUsersPage'

const ADMIN_TABS = [
  { id: 'requests', label: 'Account requests' },
  { id: 'password-resets', label: 'Password resets' },
  { id: 'add-account', label: 'Add account' },
  { id: 'manage-users', label: 'Manage users' },
  { id: 'feedback', label: 'Submitted reports' }
]

export default function SettingsAdminAccount() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'requests'
  const [requests, setRequests] = useState([])
  const [feedback, setFeedback] = useState([])
  const [passwordResets, setPasswordResets] = useState([])
  const [loading, setLoading] = useState(true)

  function setTab(next) {
    setSearchParams({ section: 'account', tab: next }, { replace: true })
  }

  useEffect(() => {
    if (tab === 'requests') loadRequests()
    if (tab === 'feedback') loadFeedback()
    if (tab === 'password-resets') loadPasswordResets()
  }, [tab])

  async function loadRequests() {
    try {
      setLoading(true)
      const res = await api.get('/Admin/account-requests')
      setRequests(res.data)
    } catch {
      await appDialog.alert({ message: 'Failed to load account requests.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function loadPasswordResets() {
    try {
      const res = await api.get('/Admin/password-reset-requests')
      setPasswordResets(res.data)
    } catch {
      await appDialog.alert({ message: 'Failed to load password reset requests.', type: 'error' })
    }
  }

  async function loadFeedback() {
    try {
      const res = await api.get('/Admin/feedback')
      setFeedback(res.data)
    } catch {
      await appDialog.alert({ message: 'Failed to load feedback.', type: 'error' })
    }
  }

  async function approvePasswordReset(id) {
    if (!(await appDialog.confirm({ title: 'Approve password reset', message: 'Approve and email a reset link?', confirmLabel: 'Approve' }))) return
    try {
      await api.post(`/Admin/password-reset-requests/${id}/approve`)
      await appDialog.alert('Approved.')
      loadPasswordResets()
    } catch (err) {
      await appDialog.alert({ message: err.response?.data?.message || 'Failed.', type: 'error' })
    }
  }

  async function rejectPasswordReset(id) {
    if (!(await appDialog.confirm({ title: 'Reject', message: 'Reject this request?', confirmLabel: 'Reject', danger: true }))) return
    try {
      await api.post(`/Admin/password-reset-requests/${id}/reject`)
      loadPasswordResets()
    } catch (err) {
      await appDialog.alert({ message: err.response?.data?.message || 'Failed.', type: 'error' })
    }
  }

  async function approveRequest(id) {
    if (!(await appDialog.confirm({ title: 'Approve account request', message: 'Approve this request?', confirmLabel: 'Approve' }))) return
    try {
      await api.post(`/Admin/account-requests/${id}/approve`)
      loadRequests()
    } catch {
      await appDialog.alert({ message: 'Failed to approve.', type: 'error' })
    }
  }

  async function rejectRequest(id) {
    if (!(await appDialog.confirm({ title: 'Reject', message: 'Reject this request?', confirmLabel: 'Reject', danger: true }))) return
    try {
      await api.post(`/Admin/account-requests/${id}/reject`)
      loadRequests()
    } catch {
      await appDialog.alert({ message: 'Failed to reject.', type: 'error' })
    }
  }

  return (
    <div>
      <div className="settings-subtabs">
        {ADMIN_TABS.map(t => (
          <button key={t.id} type="button" className={`settings-subtab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'add-account' ? <AdminAddAccountContent /> : null}
      {tab === 'manage-users' ? <AdminManageUsersContent /> : null}

      {tab === 'password-resets' ? (
        <Panel title="Pending password resets">
          {passwordResets.length === 0 ? (
            <p className="settings-empty">No pending requests.</p>
          ) : (
            <table className="settings-table">
              <thead>
                <tr style={tableHeadRowStyle}>
                  <th>User</th>
                  <th>Email</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {passwordResets.map(r => (
                  <tr key={r.id}>
                    <td>{r.displayName || r.username}</td>
                    <td>{r.email}</td>
                    <td>{new Date(r.requestedAt).toLocaleString()}</td>
                    <td>
                      <button type="button" className="settings-approve-btn" onClick={() => approvePasswordReset(r.id)}>Approve</button>
                      <button type="button" className="settings-reject-btn" onClick={() => rejectPasswordReset(r.id)}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ) : null}

      {tab === 'feedback' ? (
        <Panel title="Bug reports & feedback">
          {feedback.length === 0 ? (
            <p className="settings-empty">No feedback submitted yet.</p>
          ) : (
            <ul className="settings-feedback-list">
              {feedback.map(item => (
                <li key={item.id}>
                  <div className="settings-feedback-head">
                    <strong>{item.type}</strong>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="settings-feedback-user">{item.displayName || item.username} (@{item.username})</div>
                  <p>{item.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {tab === 'requests' ? (
        <Panel title="Account requests">
          {loading ? (
            <p>Loading…</p>
          ) : requests.length === 0 ? (
            <p className="settings-empty">No account requests.</p>
          ) : (
            <table className="settings-table">
              <thead>
                <tr style={tableHeadRowStyle}>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div className="settings-name">{req.fullName}</div>
                      <div className="settings-muted">{req.position}</div>
                    </td>
                    <td>{req.email}</td>
                    <td>{req.department}</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>{new Date(req.requestedAt).toLocaleString()}</td>
                    <td>
                      {req.status === 'Pending' ? (
                        <>
                          <button type="button" className="settings-approve-btn" onClick={() => approveRequest(req.id)}>Approve</button>
                          <button type="button" className="settings-reject-btn" onClick={() => rejectRequest(req.id)}>Reject</button>
                        </>
                      ) : (
                        <span className="settings-muted">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ) : null}
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="settings-card">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function StatusBadge({ status }) {
  const bg = status === 'Approved' ? '#16a34a' : status === 'Rejected' ? '#dc2626' : '#f59e0b'
  return <span className="settings-badge" style={{ background: bg }}>{status}</span>
}
