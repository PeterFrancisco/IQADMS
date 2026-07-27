import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'

export default function RequestsPage() {
  const navigate = useNavigate()
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const userId = localStorage.getItem('userId')

  const [overview, setOverview] = useState(null)
  const [myExtensions, setMyExtensions] = useState([])
  const [pendingExtensions, setPendingExtensions] = useState([])
  const [documentRequests, setDocumentRequests] = useState([])
  const [departments, setDepartments] = useState([])
  const [projects, setProjects] = useState([])
  const [eligibleTasks, setEligibleTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [extForm, setExtForm] = useState({ taskId: '', requestedDueDate: '', reason: '' })
  const [docForm, setDocForm] = useState({ relatedDepartmentId: '', projectId: '', title: '', description: '', dueDate: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submittingDoc, setSubmittingDoc] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      setLoading(true)
      const calls = [
        api.get('/Requests/overview'),
        api.get('/Requests/extensions/mine'),
        api.get('/Tasks'),
        api.get('/Requests/documents'),
        api.get('/Departments'),
        api.get('/Projects')
      ]
      if (isAdmin) calls.push(api.get('/Requests/extensions/pending'))

      const results = await Promise.all(calls)
      setOverview(results[0].data)
      setMyExtensions(results[1].data)
      setDocumentRequests(results[3].data)
      setDepartments(results[4].data)
      setProjects(results[5].data)

      const tasks = results[2].data.filter(t => {
        const open = t.status !== 'Completed' && t.status !== 'Done' && t.status !== 'Cancelled'
        const mine = t.assignedToUserId === userId || t.createdByUserId === userId
        return open && mine && t.dueDate
      })
      setEligibleTasks(tasks)

      if (isAdmin) setPendingExtensions(results[6].data)
      else setPendingExtensions([])
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to load requests.')
    } finally {
      setLoading(false)
    }
  }

  async function submitExtension(e) {
    e.preventDefault()
    if (!extForm.taskId || !extForm.requestedDueDate || !extForm.reason.trim() || submitting) return

    try {
      setSubmitting(true)
      await api.post('/Requests/extensions', {
        taskId: extForm.taskId,
        requestedDueDate: extForm.requestedDueDate,
        reason: extForm.reason.trim()
      })
      setExtForm({ taskId: '', requestedDueDate: '', reason: '' })
      await loadAll()
      window.dispatchEvent(new Event('iqadms-notifications-changed'))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to submit extension request.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitDocument(e) {
    e.preventDefault()
    if (!docForm.relatedDepartmentId || !docForm.title.trim() || submittingDoc) return

    try {
      setSubmittingDoc(true)
      await api.post('/Requests/documents', {
        relatedDepartmentId: docForm.relatedDepartmentId,
        projectId: docForm.projectId || null,
        title: docForm.title.trim(),
        description: docForm.description.trim() || null,
        dueDate: docForm.dueDate || null
      })
      setDocForm({ relatedDepartmentId: '', projectId: '', title: '', description: '', dueDate: '' })
      await loadAll()
      window.dispatchEvent(new Event('iqadms-notifications-changed'))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to submit document request.')
    } finally {
      setSubmittingDoc(false)
    }
  }

  async function updateDocStatus(id, status) {
    try {
      await api.put(`/Requests/documents/${id}`, { status })
      await loadAll()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Update failed.')
    }
  }

  async function reviewExtension(id, approve) {
    const note = window.prompt(approve ? 'Optional note for approval:' : 'Optional reason for rejection:') ?? ''
    try {
      await api.post(`/Requests/extensions/${id}/${approve ? 'approve' : 'reject'}`, {
        reviewNote: note || null
      })
      await loadAll()
      window.dispatchEvent(new Event('iqadms-notifications-changed'))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Action failed.')
    }
  }

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>Requests</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Account access, deadline extensions, and future PQAD request types.
      </p>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <section style={card}>
            <h2 style={sectionTitle}>Your account</h2>
            <p style={{ margin: '0 0 0.75rem', color: '#475569' }}>
              Signed in as <strong>{overview?.email}</strong>
              {overview?.isOnAllowList ? ' · on allow list' : ''}
            </p>
            {overview?.latestAccountRequest ? (
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                Latest access request: <strong>{overview.latestAccountRequest.status}</strong>
                {' · submitted '}
                {new Date(overview.latestAccountRequest.requestedAt).toLocaleString()}
              </p>
            ) : (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                No access request on file for this email.
              </p>
            )}
          </section>

          <section style={{ ...card, marginTop: '1rem' }}>
            <h2 style={sectionTitle}>Task deadline extension</h2>
            <p style={{ margin: '0 0 1rem', color: '#475569', fontSize: '0.9rem' }}>
              Request a later due date for a task you own or are assigned to. An administrator must approve.
            </p>
            {eligibleTasks.length === 0 ? (
              <p style={{ color: '#94a3b8', margin: 0 }}>No eligible tasks with due dates.</p>
            ) : (
              <form onSubmit={submitExtension}>
                <label style={label}>Task</label>
                <select
                  style={input}
                  value={extForm.taskId}
                  onChange={e => setExtForm({ ...extForm, taskId: e.target.value })}
                  required
                >
                  <option value="">Select task…</option>
                  {eligibleTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} (due {t.dueDate})
                    </option>
                  ))}
                </select>

                <label style={label}>New due date</label>
                <input
                  type="date"
                  style={input}
                  value={extForm.requestedDueDate}
                  onChange={e => setExtForm({ ...extForm, requestedDueDate: e.target.value })}
                  required
                />

                <label style={label}>Reason</label>
                <textarea
                  style={{ ...input, minHeight: 72 }}
                  value={extForm.reason}
                  onChange={e => setExtForm({ ...extForm, reason: e.target.value })}
                  required
                />

                <button type="submit" disabled={submitting} style={{ ...primaryBtn, marginTop: '0.75rem' }}>
                  {submitting ? 'Submitting…' : 'Submit extension request'}
                </button>
              </form>
            )}

            {myExtensions.length > 0 && (
              <>
                <h3 style={{ ...sectionTitle, marginTop: '1.25rem', fontSize: '0.95rem' }}>Your extension requests</h3>
                <ul style={list}>
                  {myExtensions.map(ext => (
                    <li key={ext.id}>
                      <Link to={`/my-tasks?task=${ext.taskId}`} style={anchor}>{ext.taskTitle}</Link>
                      {' · '}
                      {ext.currentDueDate || '?'} → <strong>{ext.requestedDueDate}</strong>
                      {' · '}
                      <StatusBadge status={ext.status} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {isAdmin && pendingExtensions.length > 0 && (
            <section style={{ ...card, marginTop: '1rem', borderLeft: `4px solid ${upshd.maroon}` }}>
              <h2 style={sectionTitle}>Pending extensions ({pendingExtensions.length})</h2>
              <ul style={{ ...list, padding: 0, listStyle: 'none' }}>
                {pendingExtensions.map(ext => (
                  <li key={ext.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600, color: upshd.maroon }}>{ext.taskTitle}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0' }}>
                      {ext.requestedByName} · {ext.currentDueDate || 'no due'} → {ext.requestedDueDate}
                    </div>
                    <p style={{ margin: '0.35rem 0 0.5rem', color: '#475569', fontSize: '0.9rem' }}>{ext.reason}</p>
                    <button type="button" style={{ ...primaryBtn, marginRight: 8 }} onClick={() => reviewExtension(ext.id, true)}>
                      Approve
                    </button>
                    <button type="button" style={ghostBtn} onClick={() => reviewExtension(ext.id, false)}>
                      Reject
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section style={{ ...card, marginTop: '1rem' }}>
            <h2 style={sectionTitle}>Document request (department)</h2>
            <p style={{ margin: '0 0 1rem', color: '#475569', fontSize: '0.9rem' }}>
              Track documents PQAD needs from an office or college. Departments remain metadata, not system users.
            </p>
            <form onSubmit={submitDocument}>
              <label style={label}>Department</label>
              <select
                style={input}
                value={docForm.relatedDepartmentId}
                onChange={e => setDocForm({ ...docForm, relatedDepartmentId: e.target.value })}
                required
              >
                <option value="">Select department…</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>

              <label style={label}>Project (optional)</label>
              <select
                style={input}
                value={docForm.projectId}
                onChange={e => setDocForm({ ...docForm, projectId: e.target.value })}
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>

              <label style={label}>Document / deliverable title</label>
              <input
                style={input}
                value={docForm.title}
                onChange={e => setDocForm({ ...docForm, title: e.target.value })}
                required
              />

              <label style={label}>Details</label>
              <textarea
                style={{ ...input, minHeight: 64 }}
                value={docForm.description}
                onChange={e => setDocForm({ ...docForm, description: e.target.value })}
              />

              <label style={label}>Needed by</label>
              <input
                type="date"
                style={input}
                value={docForm.dueDate}
                onChange={e => setDocForm({ ...docForm, dueDate: e.target.value })}
              />

              <button type="submit" disabled={submittingDoc} style={{ ...primaryBtn, marginTop: '0.75rem' }}>
                {submittingDoc ? 'Saving…' : 'Log document request'}
              </button>
            </form>

            {documentRequests.length > 0 && (
              <>
                <h3 style={{ ...sectionTitle, marginTop: '1.25rem', fontSize: '0.95rem' }}>Document requests</h3>
                <ul style={{ ...list, padding: 0, listStyle: 'none' }}>
                  {documentRequests.map(doc => (
                    <li key={doc.id} style={{ padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 600, color: upshd.maroon }}>{doc.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {doc.departmentName}
                        {doc.projectTitle ? ` · ${doc.projectTitle}` : ''}
                        {' · '}
                        <StatusBadge status={doc.status} />
                      </div>
                      {doc.dueDate && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Needed by {doc.dueDate}</div>
                      )}
                      {(isAdmin || doc.requestedByName) && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {doc.status === 'Pending' && isAdmin && (
                            <button type="button" style={ghostBtn} onClick={() => updateDocStatus(doc.id, 'In Progress')}>
                              Mark in progress
                            </button>
                          )}
                          {doc.status !== 'Fulfilled' && isAdmin && (
                            <button type="button" style={primaryBtn} onClick={() => updateDocStatus(doc.id, 'Fulfilled')}>
                              Mark fulfilled
                            </button>
                          )}
                          {(doc.status === 'Pending' || isAdmin) && doc.status !== 'Cancelled' && (
                            <button type="button" style={ghostBtn} onClick={() => updateDocStatus(doc.id, 'Cancelled')}>
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section style={{ ...card, marginTop: '1rem' }}>
            <h2 style={sectionTitle}>Account access (colleague)</h2>
            <p style={{ margin: '0 0 1rem', color: '#475569' }}>
              Send a new user through the public access request form.
            </p>
            <button type="button" style={primaryBtn} onClick={() => navigate('/request-access')}>
              Open access request form
            </button>
          </section>

          {isAdmin && (
            <section style={{ ...card, marginTop: '1rem' }}>
              <h2 style={sectionTitle}>Administrator</h2>
              <p style={{ margin: '0 0 1rem', color: '#475569' }}>
                {overview?.pendingAccountRequestsForAdmin ?? 0} pending account request(s).
                {overview?.pendingExtensionRequestsForAdmin
                  ? ` ${overview.pendingExtensionRequestsForAdmin} pending extension(s).`
                  : ''}
              </p>
              <Link to="/settings" style={{ ...primaryBtn, display: 'inline-block', textDecoration: 'none' }}>
                Review account requests
              </Link>
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

function StatusBadge({ status }) {
  const colors = {
    Pending: '#f59e0b',
    Approved: '#16a34a',
    Rejected: '#dc2626'
  }
  return (
    <span style={{ fontWeight: 700, color: colors[status] || '#64748b', fontSize: '0.85rem' }}>
      {status}
    </span>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: '1.15rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const sectionTitle = { margin: '0 0 0.75rem', fontSize: '1.05rem', color: upshd.maroon }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: upshd.maroon, color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const label = { display: 'block', marginTop: '0.65rem', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem', color: '#475569' }
const input = { width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }
const list = { margin: 0, paddingLeft: '1.1rem', color: '#334155' }
const anchor = { color: upshd.maroon, fontWeight: 600, textDecoration: 'none' }
