import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'import { appDialog } from '../utils/appDialog'


export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [contactForm, setContactForm] = useState({ contactName: '', contactEmail: '', contactPhone: '' })
  const [savingContacts, setSavingContacts] = useState(false)
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadList()
  }, [])

  async function loadList() {
    try {
      setLoading(true)
      const res = await api.get('/Departments')
      setDepartments(res.data)
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to load departments.')
    } finally {
      setLoading(false)
    }
  }

  async function openDetail(id) {
    setSelectedId(id)
    setDetail(null)
    try {
      setDetailLoading(true)
      const res = await api.get(`/Departments/${id}`)
      setDetail(res.data)
      setContactForm({
        contactName: res.data.contactName || '',
        contactEmail: res.data.contactEmail || '',
        contactPhone: res.data.contactPhone || ''
      })
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to load department details.')
      setSelectedId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
  }

  async function saveContacts() {
    if (!selectedId || savingContacts) return
    try {
      setSavingContacts(true)
      await api.put(`/Departments/${selectedId}`, {
        contactName: contactForm.contactName || null,
        contactEmail: contactForm.contactEmail || null,
        contactPhone: contactForm.contactPhone || null
      })
      await loadList()
      await openDetail(selectedId)
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to save contacts.')
    } finally {
      setSavingContacts(false)
    }
  }

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>Departments</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Offices and colleges PQAD coordinates with. Departments are metadata on tasks, not assignees.
      </p>

      {loading ? (
        <p>Loading departments…</p>
      ) : departments.length === 0 ? (
        <div style={card}>No departments in the system yet.</div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: upshd.tableHeadBg }}>
                <th style={th}>Code</th>
                <th style={th}>Name</th>
                <th style={th}>Open tasks</th>
                <th style={th}>Total related tasks</th>
                <th style={th}>Projects</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id}>
                  <td style={td}><strong>{d.code}</strong></td>
                  <td style={td}>{d.name}</td>
                  <td style={td}>{d.openRelatedTaskCount}</td>
                  <td style={td}>{d.relatedTaskCount}</td>
                  <td style={td}>{d.projectCount}</td>
                  <td style={td}>
                    <button type="button" style={linkBtn} onClick={() => openDetail(d.id)}>Details</button>
                    {d.relatedTaskCount > 0 && (
                      <Link to={`/my-tasks?department=${d.id}`} style={{ ...linkBtn, marginLeft: 8, textDecoration: 'none' }}>
                        Tasks
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <div style={overlay}>
          <div style={modal}>
            {detailLoading || !detail ? (
              <p>Loading…</p>
            ) : (
              <>
                <h2 style={{ margin: '0 0 0.35rem', color: upshd.maroon }}>
                  {detail.name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({detail.code})</span>
                </h2>
                <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                  {detail.openRelatedTaskCount} open · {detail.relatedTaskCount} related tasks · {detail.projectCount} projects
                </p>

                {(detail.contactName || detail.contactEmail || detail.contactPhone) && !isAdmin && (
                  <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                    <strong>Contact:</strong>{' '}
                    {detail.contactName && <span>{detail.contactName} </span>}
                    {detail.contactEmail && (
                      <a href={`mailto:${detail.contactEmail}`} style={{ color: upshd.maroon }}>{detail.contactEmail}</a>
                    )}
                    {detail.contactPhone && <span> · {detail.contactPhone}</span>}
                  </div>
                )}

                {isAdmin && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ ...sectionTitle, marginTop: 0 }}>Contact person</h3>
                    <label style={label}>Name</label>
                    <input style={input} value={contactForm.contactName} onChange={e => setContactForm({ ...contactForm, contactName: e.target.value })} />
                    <label style={label}>Email</label>
                    <input style={input} type="email" value={contactForm.contactEmail} onChange={e => setContactForm({ ...contactForm, contactEmail: e.target.value })} />
                    <label style={label}>Phone</label>
                    <input style={input} value={contactForm.contactPhone} onChange={e => setContactForm({ ...contactForm, contactPhone: e.target.value })} />
                    <button type="button" style={{ ...primaryBtn, marginTop: '0.5rem' }} disabled={savingContacts} onClick={saveContacts}>
                      {savingContacts ? 'Saving…' : 'Save contacts'}
                    </button>
                  </div>
                )}

                {detail.projects.length > 0 && (
                  <>
                    <h3 style={sectionTitle}>Involved projects</h3>
                    <ul style={list}>
                      {detail.projects.map(p => (
                        <li key={p.projectId}>
                          <Link to="/projects" style={anchor}>{p.title}</Link>
                          <span style={{ color: '#94a3b8', marginLeft: 8 }}>{p.status}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <h3 style={sectionTitle}>Recent related tasks</h3>
                {detail.recentTasks.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>No tasks linked to this department yet.</p>
                ) : (
                  <ul style={list}>
                    {detail.recentTasks.map(t => (
                      <li key={t.taskId}>
                        <Link to="/my-tasks" style={anchor}>{t.title}</Link>
                        <span style={{ color: '#64748b', marginLeft: 8, fontSize: '0.85rem' }}>
                          {t.status}
                          {t.dueDate ? ` · due ${t.dueDate}` : ''}
                          {t.projectTitle ? ` · ${t.projectTitle}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <Link to={`/my-tasks?department=${detail.id}`} style={{ ...primaryBtn, textDecoration: 'none' }}>
                    View tasks
                  </Link>
                  <button type="button" onClick={closeDetail} style={ghostBtn}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const th = { textAlign: 'left', padding: '0.85rem 1rem', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }
const td = { padding: '0.85rem 1rem', borderBottom: '1px solid #f1f5f9' }
const linkBtn = { padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: upshd.maroon, fontWeight: 600 }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }
const modal = { background: '#fff', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }
const sectionTitle = { margin: '1rem 0 0.5rem', fontSize: '0.95rem', color: upshd.maroon }
const list = { margin: 0, paddingLeft: '1.1rem', color: '#334155' }
const anchor = { color: upshd.maroon, fontWeight: 600, textDecoration: 'none' }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: upshd.maroon, color: '#fff', fontWeight: 600 }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const label = { display: 'block', marginTop: '0.5rem', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }
const input = { width: '100%', padding: '0.5rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }
