import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { pageTitleStyle } from '../theme/pageStyles'
import '../theme/projects-page.css'
import { countOrphanTasks, effectiveTaskSectionId, NO_PROJECT_SECTION } from '../utils/notificationLink'
import { appDialog } from '../utils/appDialog'

const emptyForm = () => ({
  title: '',
  description: '',
  showDescription: false,
  startDate: '',
  dueDate: '',
  notes: '',
  taskWorkflow: [{ title: '' }]
})

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [orphanTaskCount, setOrphanTaskCount] = useState(0)
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
      const [projRes, tasksRes] = await Promise.all([
        api.get('/Projects'),
        api.get('/Tasks')
      ])
      setProjects(projRes.data)
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
    const workflow = (project.taskWorkflow?.length ? project.taskWorkflow : [{ title: '' }]).map(s => ({
      title: s.title || ''
    }))
    setEditingId(project.id)
    setForm({
      title: project.title,
      description: project.description || '',
      showDescription: Boolean(project.description),
      startDate: project.startDate || '',
      dueDate: project.dueDate || '',
      notes: project.notes || '',
      taskWorkflow: workflow
    })
    setModalOpen(true)
  }

  function addWorkflowStep() {
    setForm(prev => ({ ...prev, taskWorkflow: [...prev.taskWorkflow, { title: '' }] }))
  }

  function updateWorkflowStep(index, title) {
    setForm(prev => ({
      ...prev,
      taskWorkflow: prev.taskWorkflow.map((step, i) => (i === index ? { title } : step))
    }))
  }

  function removeWorkflowStep(index) {
    setForm(prev => ({
      ...prev,
      taskWorkflow: prev.taskWorkflow.filter((_, i) => i !== index)
    }))
  }

  function moveWorkflowStep(index, direction) {
    setForm(prev => {
      const next = [...prev.taskWorkflow]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...prev, taskWorkflow: next }
    })
  }

  async function saveProject() {
    if (!form.title.trim() || saving) return

    const workflow = form.taskWorkflow
      .map(s => ({ title: s.title.trim() }))
      .filter(s => s.title)

    const payload = {
      title: form.title.trim(),
      description: form.showDescription ? form.description.trim() || null : null,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      notes: form.notes.trim() || null,
      taskWorkflow: workflow
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

  async function clearOrphanTasks() {
    if (
      !(await appDialog.confirm({
        title: 'Clear No project board',
        message: `Delete all ${orphanTaskCount} task(s) not linked to an active project? This cannot be undone.`,
        confirmLabel: 'Delete all tasks',
        danger: true
      }))
    )
      return
    try {
      const tasksRes = await api.get('/Tasks')
      const activeIds = new Set(projects.map(p => String(p.id)))
      const orphans = (tasksRes.data || []).filter(
        t => effectiveTaskSectionId(t, activeIds) === NO_PROJECT_SECTION
      )
      await Promise.all(orphans.map(t => api.delete(`/Tasks/${t.id}`)))
      await appDialog.alert('No project board cleared.')
      loadAll()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to delete tasks.')
      loadAll()
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
          <p style={{ margin: 0, color: '#64748b' }}>No projects yet. Create one to group tasks.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {orphanTaskCount > 0 && (
            <div key={NO_PROJECT_SECTION} className="projects-page-card projects-page-card--orphan">
              <div className="projects-page-card__top">
                <div className="projects-page-card__progress" style={{ background: 'conic-gradient(#64748b 0deg, #e2e8f0 0)' }} aria-hidden>
                  <span aria-hidden />
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
                  <button type="button" onClick={clearOrphanTasks} className="projects-page-card__danger">
                    Clear board
                  </button>
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
                  {p.notes && (
                    <p className="projects-page-card__desc" style={{ fontStyle: 'italic', color: '#64748b' }}>
                      {p.notes}
                    </p>
                  )}
                  <div className="projects-page-card__badges">
                    {p.dueDate && <Badge label={`Due ${p.dueDate}`} muted />}
                    <Badge label={`${p.openTaskCount} open / ${p.taskCount} tasks`} muted />
                    {p.taskCount > 0 && (
                      <Badge
                        label={`Progress ${p.taskProgressDone ?? 0}/${p.taskCount} (${p.taskProgressPercent ?? 0}%)`}
                        muted
                      />
                    )}
                  </div>
                  {p.taskWorkflow?.length > 0 && (
                    <p className="projects-page-card__desc" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      Workflow: {p.taskWorkflow.map(s => s.title).join(' → ')}
                    </p>
                  )}
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
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div style={overlay}>
          <div style={modalWide}>
            <h2 style={{ margin: '0 0 1rem', color: 'var(--upshd-page-heading, var(--upshd-maroon))' }}>
              {editingId ? 'Edit project' : 'New project'}
            </h2>

            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

            {!form.showDescription ? (
              <button
                type="button"
                style={{ ...ghostBtn, marginTop: '0.75rem' }}
                onClick={() => setForm({ ...form, showDescription: true })}
              >
                + Add description (optional)
              </button>
            ) : (
              <>
                <label style={labelStyle}>Description (optional)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </>
            )}

            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              placeholder="Status, urgency, or other free-form notes for this project"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
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

            <label style={labelStyle}>Task workflow</label>
            <p style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
              List tasks in pull order. The first step is created as To Do; later steps start as Waiting.
              {!editingId && ' Tasks are created when you save a new project.'}
            </p>
            <div style={workflowList}>
              {form.taskWorkflow.map((step, index) => (
                <div key={index} style={workflowRow}>
                  <span style={workflowOrder}>{index + 1}</span>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={index === 0 ? 'First task to pull' : 'Next workflow step'}
                    value={step.title}
                    onChange={e => updateWorkflowStep(index, e.target.value)}
                  />
                  <button type="button" style={iconBtn} onClick={() => moveWorkflowStep(index, -1)} disabled={index === 0} title="Move up">
                    ↑
                  </button>
                  <button type="button" style={iconBtn} onClick={() => moveWorkflowStep(index, 1)} disabled={index === form.taskWorkflow.length - 1} title="Move down">
                    ↓
                  </button>
                  <button
                    type="button"
                    style={iconBtn}
                    onClick={() => removeWorkflowStep(index)}
                    disabled={form.taskWorkflow.length === 1}
                    title="Remove step"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" style={{ ...ghostBtn, marginTop: '0.5rem' }} onClick={addWorkflowStep}>
              + Add workflow step
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
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
        color: muted ? '#475569' : 'var(--upshd-page-heading, var(--upshd-maroon))',
        fontWeight: 600
      }}
    >
      {label}
    </span>
  )
}

const emptyCard = {
  background: 'var(--upshd-surface, #fff)',
  borderRadius: 12,
  padding: '2.5rem',
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,.06)'
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }
const modalWide = { background: 'var(--upshd-surface, #fff)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }
const labelStyle = { display: 'block', marginBottom: '0.35rem', marginTop: '0.75rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }
const inputStyle = { width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }
const workflowList = { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
const workflowRow = { display: 'flex', alignItems: 'center', gap: '0.35rem' }
const workflowOrder = { width: 22, textAlign: 'center', fontWeight: 700, color: '#64748b', flexShrink: 0 }
const iconBtn = { padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', lineHeight: 1 }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: 'var(--upshd-maroon)', color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid var(--upshd-border, #cbd5e1)', background: 'var(--upshd-surface, #fff)', cursor: 'pointer' }
