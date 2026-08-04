import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import AppModal from '../components/AppModal'
import api from '../services/api'
import {
  fieldInputStyle,
  ghostButtonStyle,
  primaryButtonStyle
} from '../theme/pageStyles'
import '../theme/announcements-page.css'
import { appDialog } from '../utils/appDialog'
import {
  ANNOUNCEMENT_CATEGORY_COLORS,
  formatDateRange,
  isAnnouncementPast,
  isAnnouncementUpcoming
} from '../utils/calendarEvents'

const CATEGORIES = ['Orientation', 'Meeting', 'PACUCOA Visit', 'General']
const DESCRIPTION_COLLAPSE_LEN = 220

const emptyForm = () => ({
  title: '',
  description: '',
  category: 'Meeting',
  startDate: '',
  endDate: '',
  location: ''
})

export default function AnnouncementsPage() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('id')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [timeFilter, setTimeFilter] = useState('upcoming')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const highlightRef = useRef(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!highlightId || loading) return
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setExpandedIds(prev => new Set(prev).add(highlightId))
  }, [highlightId, loading, items])

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

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(a => {
      if (timeFilter === 'upcoming' && !isAnnouncementUpcoming(a)) return false
      if (timeFilter === 'past' && !isAnnouncementPast(a)) return false
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
      if (!q) return true
      const haystack = [a.title, a.description, a.location, a.category, a.createdByName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [items, timeFilter, categoryFilter, search])

  const upcomingCount = useMemo(() => items.filter(a => isAnnouncementUpcoming(a)).length, [items])

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

  function toggleExpanded(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <DashboardLayout>
      <header className="announcements-page-header">
        <div>
          <h1>Announcements</h1>
          <p>PQAD orientation, meetings, and PACUCOA visits. Events appear on the calendar for all members.</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={openCreate} style={primaryButtonStyle}>
            New announcement
          </button>
        )}
      </header>

      <div className="announcements-page-links">
        <Link to="/calendar">Open calendar view</Link>
        {!loading && upcomingCount > 0 && (
          <span style={{ color: 'var(--upshd-text-muted, #64748b)' }}>
            {upcomingCount} upcoming event{upcomingCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="announcements-toolbar">
        <input
          type="search"
          className="announcements-search"
          placeholder="Search title, location, details…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search announcements"
        />

        <div className="announcements-filter-tabs" role="group" aria-label="Time filter">
          {[
            ['upcoming', 'Upcoming'],
            ['past', 'Past'],
            ['all', 'All']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={timeFilter === value ? 'is-active' : ''}
              onClick={() => setTimeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="announcements-category-select"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {!loading && (
          <span className="announcements-count">
            {filteredItems.length} shown
          </span>
        )}
      </div>

      {loading ? (
        <div className="announcements-skeleton" aria-busy="true">
          {[1, 2, 3].map(i => (
            <div key={i} className="announcements-skeleton-card" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="announcements-empty">
          {items.length === 0
            ? `No announcements yet.${isAdmin ? ' Create one for orientation or a PACUCOA visit.' : ''}`
            : 'No announcements match your filters.'}
        </div>
      ) : (
        <div className="announcements-list">
          {filteredItems.map(a => {
            const isPast = isAnnouncementPast(a)
            const isHighlighted = highlightId && String(a.id).toLowerCase() === highlightId.toLowerCase()
            const isExpanded = expandedIds.has(String(a.id))
            const longDescription = (a.description?.length || 0) > DESCRIPTION_COLLAPSE_LEN
            const borderColor = ANNOUNCEMENT_CATEGORY_COLORS[a.category] || 'var(--upshd-maroon, #7a0019)'

            return (
              <article
                key={a.id}
                ref={isHighlighted ? highlightRef : undefined}
                className={`announcements-card${isHighlighted ? ' is-highlighted' : ''}${isPast ? ' is-past' : ''}`}
                style={{ borderLeft: `4px solid ${borderColor}` }}
              >
                <div className="announcements-card-head">
                  <div>
                    <span className="announcements-badge">{a.category}</span>
                    <h2 className="announcements-card-title">{a.title}</h2>
                    <p className="announcements-card-meta">{formatDateRange(a.startDate, a.endDate)}</p>
                    <div className="announcements-card-meta-row">
                      {a.location && <span>{a.location}</span>}
                      {a.createdByName && <span>Posted by {a.createdByName}</span>}
                      <span
                        className={`announcements-status-pill${isPast ? ' is-past' : ' is-upcoming'}`}
                      >
                        {isPast ? 'Past' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="announcements-card-actions">
                      <button type="button" style={ghostButtonStyle} onClick={() => openEdit(a)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        style={{ ...ghostButtonStyle, color: '#dc2626', borderColor: '#fecaca' }}
                        onClick={() => remove(a.id, a.title)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {a.description && (
                  <>
                    <p
                      className={`announcements-card-body${longDescription && !isExpanded ? ' is-collapsed' : ''}`}
                    >
                      {a.description}
                    </p>
                    {longDescription && (
                      <button
                        type="button"
                        className="announcements-expand-btn"
                        onClick={() => toggleExpanded(String(a.id))}
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </>
                )}

                <div className="announcements-card-footer-links">
                  <Link to={`/calendar?date=${a.startDate}`}>View on calendar</Link>
                  <Link to={`/announcements?id=${a.id}`}>Share link</Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {isAdmin && (
        <AppModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'Edit announcement' : 'New announcement'}
          size="md"
          footer={
            <div className="app-modal-actions">
              <button type="button" className="app-modal-btn app-modal-btn-ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="app-modal-btn app-modal-btn-primary"
                disabled={saving || !form.title.trim() || !form.startDate}
                onClick={save}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          }
        >
          <div className="announcements-form">
            <label htmlFor="ann-title">Title</label>
            <input
              id="ann-title"
              style={fieldInputStyle}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />

            <label htmlFor="ann-category">Category</label>
            <select
              id="ann-category"
              style={fieldInputStyle}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="announcements-form-grid">
              <div>
                <label htmlFor="ann-start">Start date</label>
                <input
                  id="ann-start"
                  type="date"
                  style={fieldInputStyle}
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="ann-end">End date (optional)</label>
                <input
                  id="ann-end"
                  type="date"
                  style={fieldInputStyle}
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <label htmlFor="ann-location">Location</label>
            <input
              id="ann-location"
              style={fieldInputStyle}
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="Room, virtual link, campus…"
            />

            <label htmlFor="ann-details">Details</label>
            <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', color: 'var(--upshd-text-muted, #64748b)' }}>
              Use @everyone or @username in the text to notify specific members.
            </p>
            <textarea
              id="ann-details"
              style={{ ...fieldInputStyle, minHeight: 80 }}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </AppModal>
      )}
    </DashboardLayout>
  )
}
