import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'
import '../theme/projects-page.css'
import { countOrphanTasks, NO_PROJECT_SECTION } from '../utils/notificationLink'
import { appDialog } from '../utils/appDialog'

const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const emptyForm = () => ({
  title: '',
  description: '',
  startDate: '',
  dueDate: '',
  status: 'Planning',
  priority: 'Medium',
  memberUserIds: [],
  departmentIds: []
})

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [orphanTaskCount, setOrphanTaskCount] = useState(0)
  const [members, setMembers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      setLoading(true)
      const [projRes, membersRes, deptRes, tasksRes] = await Promise.all([
        api.get('/Projects'),
        api.get('/Profile/members'),
        api.get('/Departments'),
        api.get('/Tasks')
      ])
      setProjects(projRes.data)
      setMembers(membersRes.data)
      setDepartments(deptRes.data)
      const activeIds = new Set(projRes.data.map(p => String(p.id)))
      setOrphanTaskCount(countOrphanTasks(tasksRes.data, activeIds))
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(project) {
    setEditingId(project.id)
    setForm({
      title: project.title,
      description: project.description || '',
      startDate: project.startDate || '',
      dueDate: project.dueDate || '',
      status: project.status,
      priority: project.priority,
      memberUserIds: project.members.map(m => m.userId),
      departmentIds: project.departments.map(d => d.departmentId)
    })
    setModalOpen(true)
  }

  function toggleId(listKey, id) {
    setForm(prev => {
      const set = new Set(prev[listKey])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, [listKey]: [...set] }
    })
  }

  async function saveProject() {
    if (!form.title.trim() || saving) return

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      status: form.status,
      priority: form.priority,
      memberUserIds: form.memberUserIds,
      departmentIds: form.departmentIds
    }

    try {
      setSaving(true)
      if (editingId) {
        await api.put(`/Projects/${editingId}`, payload)
      } else {
        await api.post('/Projects', payload)
      }
      setModalOpen(false)
      loadAll()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to save project.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject(id, title) {
    if (
      !(await appDialog.confirm({
        title: 'Delete project',
        message: `Delete project "${title}"? Tasks in this board will move to No project.`,
        confirmLabel: 'Delete',
        danger: true
      }))
    )
      return
    try {
      await api.delete(`/Projects/${id}`)
      loadAll()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to delete project.')
    }
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={pageTitleStyle}>Projects</h1>
          <p style={{ color: '#666', margin: 0 }}>
            Accreditation and PQAD initiatives (e.g. PACUCOA 2026)
          </p>
        </div>
        <button type="button" onClick={openCreate} style={primaryBtn}>
          New project
        </button>
      </div>

      {loading ? (
        <p>Loading projects…</p>
      ) : projects.length === 0 && orphanTaskCount === 0 ? (
        <div style={emptyCard}>
          <p style={{ margin: 0, color: '#64748b' }}>No projects yet. Create one to group tasks and departments.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {orphanTaskCount > 0 && (
            <div key={NO_PROJECT_SECTION} className="projects-page-card projects-page-card--orphan">
              <div className="projects-page-card__top">
                <div className="projects-page-card__progress" style={{ background: 'conic-gradient(#64748b 0deg, #e2e8f0 0)' }} aria-hidden>
                  <span>—</span>
                </div>
                <div className="projects-page-card__main">
                  <h2 className="projects-page-card__title">No project</h2>
                  <p className="projects-page-card__desc">
                    Tasks not linked to an active project ({orphanTaskCount} task{orphanTaskCount === 1 ? '' : 's'}).
                  </p>
                  <div className="projects-page-card__badges">
                    <Badge label={`${orphanTaskCount} task${orphanTaskCount === 1 ? '' : 's'}`} muted />
                  </div>
                </div>
                <div className="projects-page-card__actions">
                  <Link to={`/my-tasks?project=${NO_PROJECT_SECTION}`} className="projects-page-card__link">
                    View tasks
                  </Link>
                </div>
              </div>
            </div>
          )}
          {projects.map(p => (
            <div key={p.id} className="projects-page-card">
              <div className="projects-page-card__top">
                <div
                  className="projects-page-card__progress"
                  style={{
                    background: `conic-gradient(#7a0019 ${(p.taskProgressPercent ?? 0) * 3.6}deg, #e2e8f0 0deg)`
                  }}
                  aria-hidden
                >
                  <span>{p.taskProgressPercent ?? 0}%</span>
                </div>
                <div className="projects-page-card__main">
                  <h2 className="projects-page-card__title">{p.title}</h2>
                  {p.description && (
                    <p className="projects-page-card__desc">{p.description}</p>
                  )}
                  <div className="projects-page-card__badges">
                    <Badge label={p.status} />
                    <Badge label={`Priority: ${p.priority}`} muted />
                    {p.dueDate && <Badge label={`Due ${p.dueDate}`} muted />}
                    <Badge label={`${p.openTaskCount} open / ${p.taskCount} tasks`} muted />
                    {p.taskCount > 0 && (
                      <Badge
                        label={`Progress ${p.taskProgressDone ?? 0}/${p.taskCount} (${p.taskProgressPercent ?? 0}%)`}
                        muted
                      />
                    )}
                  </div>
                </div>
                <div className="projects-page-card__actions">
                  <Link to={`/my-tasks?project=${p.id}`} className="projects-page-card__link">
                    View tasks
                  </Link>
                  <button type="button" onClick={() => openEdit(p)} className="projects-page-card__ghost">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteProject(p.id, p.title)} className="projects-page-card__danger">
                    Delete
                  </button>
                </div>
              </div>

              {(p.members.length > 0 || p.departments.length > 0) && (
                <div className="projects-page-card__meta">
                  {p.members.length > 0 && (
                    <div>
                      <div style={metaLabel}>PQAD members</div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#334155' }}>
                        {p.members.map(m => (
                          <li key={m.userId}>{m.displayName || m.username}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p.departments.length > 0 && (
                    <div>
                      <div style={metaLabel}>Involved departments</div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#334155' }}>
                        {p.departments.map(d => (
                          <li key={d.departmentId}>{d.name} ({d.code})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{ margin: '0 0 1rem', color: upshd.maroon }}>
              {editingId ? 'Edit project' : 'New project'}
            </h2>

            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Start date</label>
                <input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Due date</label>
                <input type="date" style={inputStyle} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {PROJECT_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <label style={labelStyle}>PQAD members</label>
            <div style={checkList}>
              {members.map(m => (
                <label key={m.id} style={checkRow}>
                  <input
                    type="checkbox"
                    checked={form.memberUserIds.includes(m.id)}
                    onChange={() => toggleId('memberUserIds', m.id)}
                  />
                  {m.displayName || m.username}
                </label>
              ))}
            </div>

            <label style={labelStyle}>Involved departments</label>
            <div style={checkList}>
              {departments.map(d => (
                <label key={d.id} style={checkRow}>
                  <input
                    type="checkbox"
                    checked={form.departmentIds.includes(d.id)}
                    onChange={() => toggleId('departmentIds', d.id)}
                  />
                  {d.name} ({d.code})
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setModalOpen(false)} style={ghostBtn}>
                Cancel
              </button>
              <button type="button" onClick={saveProject} disabled={saving} style={primaryBtn}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function Badge({ label, muted }) {
  return (
    <span
      style={{
        padding: '0.2rem 0.55rem',
        borderRadius: 999,
        background: muted ? '#f1f5f9' : '#fde8ec',
        color: muted ? '#475569' : upshd.maroon,
        fontWeight: 600
      }}
    >
      {label}
    </span>
  )
}

const projectCard = {
  background: '#fff',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  boxShadow: '0 2px 8px rgba(0,0,0,.06)'
}

const emptyCard = {
  ...projectCard,
  textAlign: 'center',
  padding: '2.5rem'
}

const metaLabel = { fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }
const modal = { background: '#fff', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }
const labelStyle = { display: 'block', marginBottom: '0.35rem', marginTop: '0.75rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }
const inputStyle = { width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }
const checkList = { maxHeight: 140, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.75rem' }
const checkRow = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', cursor: 'pointer', fontSize: '0.9rem' }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: upshd.maroon, color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const dangerBtn = { ...ghostBtn, color: '#dc2626', borderColor: '#fecaca' }
const linkBtn = { ...ghostBtn, textDecoration: 'none', color: upshd.maroon, fontWeight: 600 }
