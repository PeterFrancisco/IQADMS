import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'import { appDialog } from '../utils/appDialog'


const CATEGORIES = ['Orientation', 'Meeting', 'PACUCOA Visit', 'General']

const CATEGORY_COLORS = {
  Orientation: '#7a0019',
  Meeting: '#0ea5e9',
  'PACUCOA Visit': '#9333ea',
  General: '#64748b'
}

const emptyForm = () => ({
  title: '',
  description: '',
  category: 'Meeting',
  startDate: '',
  endDate: '',
  location: ''
})

function formatRange(a) {
  if (a.endDate && a.endDate !== a.startDate) return `${a.startDate} to ${a.endDate}`
  return a.startDate
}

export default function AnnouncementsPage() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      const res = await api.get('/Announcements')
      setItems(res.data)
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to load announcements.')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(a) {
    setEditingId(a.id)
    setForm({
      title: a.title,
      description: a.description || '',
      category: a.category,
      startDate: a.startDate,
      endDate: a.endDate || '',
      location: a.location || ''
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.title.trim() || !form.startDate || saving) return

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      startDate: form.startDate,
      endDate: form.endDate || null,
      location: form.location.trim() || null
    }

    try {
      setSaving(true)
      if (editingId) {
        await api.put(`/Announcements/${editingId}`, payload)
      } else {
        await api.post('/Announcements', payload)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id, title) {
    if (
      !(await appDialog.confirm({
        title: 'Remove announcement',
        message: `Remove announcement "${title}"?`,
        confirmLabel: 'Remove',
        danger: true
      }))
    )
      return
    try {
      await api.delete(`/Announcements/${id}`)
      load()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to delete.')
    }
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={pageTitleStyle}>Announcements</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            PQAD orientation, meetings, and PACUCOA visits also appear on the calendar.
          </p>
        </div>
        {isAdmin && (
          <button type="button" onClick={openCreate} style={primaryBtn}>
            New announcement
          </button>
        )}
      </div>

      <p style={{ marginBottom: '1rem' }}>
        <Link to="/calendar" style={{ color: upshd.maroon, fontWeight: 600 }}>Open calendar view</Link>
      </p>

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div style={card}>No announcements yet.{isAdmin ? ' Create one for orientation or a PACUCOA visit.' : ''}</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {items.map(a => (
            <article key={a.id} style={{ ...card, borderLeft: `4px solid ${CATEGORY_COLORS[a.category] || upshd.maroon}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={badge}>{a.category}</span>
                  <h2 style={{ margin: '0.35rem 0', color: upshd.maroon, fontSize: '1.15rem' }}>{a.title}</h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    {formatRange(a)}
                    {a.location ? ` · ${a.location}` : ''}
                  </p>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" style={ghostBtn} onClick={() => openEdit(a)}>Edit</button>
                    <button type="button" style={dangerBtn} onClick={() => remove(a.id, a.title)}>Delete</button>
                  </div>
                )}
              </div>
              {a.description && (
                <p style={{ margin: '0.75rem 0 0', color: '#475569', whiteSpace: 'pre-wrap' }}>{a.description}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {modalOpen && isAdmin && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{ margin: '0 0 1rem', color: upshd.maroon }}>
              {editingId ? 'Edit announcement' : 'New announcement'}
            </h2>

            <label style={label}>Title</label>
            <input style={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

            <label style={label}>Category</label>
            <select style={input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={label}>Start date</label>
                <input type="date" style={input} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label style={label}>End date (optional)</label>
                <input type="date" style={input} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            <label style={label}>Location</label>
            <input style={input} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Room, virtual link, campus…" />

            <label style={label}>Details</label>
            <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', color: '#64748b' }}>
              Use @everyone or @username in the text to notify specific members.
            </p>
            <textarea style={{ ...input, minHeight: 80 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" style={ghostBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" style={primaryBtn} disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: '1.15rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const badge = { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: upshd.maroon, color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const dangerBtn = { ...ghostBtn, color: '#dc2626', borderColor: '#fecaca' }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }
const modal = { background: '#fff', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }
const label = { display: 'block', marginTop: '0.65rem', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem', color: '#475569' }
const input = { width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }
