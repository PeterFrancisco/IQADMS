import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { resolveNotificationLink } from '../utils/notificationLink'
import {
  accentTextStyle,
  bodyTextStyle,
  ghostButtonStyle,
  mutedTextStyle,
  pageTitleStyle,
  primaryButtonStyle,
  surfaceCardStyle
} from '../theme/pageStyles'
import { appDialog } from '../utils/appDialog'


const CATEGORY_LABELS = {
  task: 'Task',
  reminder: 'Reminder',
  admin: 'Admin',
  announcement: 'Announcement'
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    try {
      setLoading(true)
      const res = await api.get('/Notifications', {
        params: { unreadOnly: filter === 'unread' }
      })
      setItems(res.data)
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id, linkPath) {
    try {
      await api.put(`/Notifications/${id}/read`)
      setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
      window.dispatchEvent(new Event('iqadms-notifications-changed'))
      if (linkPath) navigate(linkPath)
    } catch (err) {
      console.error(err)
    }
  }

  async function markAllRead() {
    try {
      await api.put('/Notifications/read-all')
      await load()
      window.dispatchEvent(new Event('iqadms-notifications-changed'))
    } catch (err) {
      console.error(err)
      await appDialog.alert('Failed to mark all as read.')
    }
  }

  async function dismiss(id) {
    try {
      await api.delete(`/Notifications/${id}`)
      setItems(prev => prev.filter(n => n.id !== id))
      window.dispatchEvent(new Event('iqadms-notifications-changed'))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={pageTitleStyle}>Notifications</h1>
          <p style={{ ...mutedTextStyle, margin: 0 }}>
            Assignments, due dates, comments, and admin alerts.
          </p>
        </div>
        <button type="button" onClick={markAllRead} style={ghostBtn}>
          Mark all read
        </button>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterBtn>
        <FilterBtn active={filter === 'unread'} onClick={() => setFilter('unread')}>Unread</FilterBtn>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div style={card}>No notifications in this view.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
          {items.map(n => (
            <li
              key={n.id}
              style={{
                ...card,
                borderLeft: n.isRead ? '4px solid var(--upshd-border, #e2e8f0)' : '4px solid var(--upshd-maroon, #7a0019)',
                opacity: n.isRead ? 0.85 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={badge}>{CATEGORY_LABELS[n.category] || n.category}</span>
                  <h3 style={{ margin: '0.35rem 0', ...accentTextStyle, fontSize: '1.05rem' }}>{n.title}</h3>
                  {n.body && <p style={{ margin: 0, ...bodyTextStyle }}>{n.body}</p>}
                  <time style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', ...mutedTextStyle, opacity: 0.85 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </time>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                  {!n.isRead && (
                    <button type="button" style={primaryBtn} onClick={() => markRead(n.id, resolveNotificationLink(n))}>
                      {resolveNotificationLink(n) !== '/notifications' ? 'Open & mark read' : 'Mark read'}
                    </button>
                  )}
                  {n.isRead && resolveNotificationLink(n) !== '/notifications' && (
                    <Link to={resolveNotificationLink(n)} style={{ ...ghostBtn, textDecoration: 'none', textAlign: 'center' }}>
                      Open
                    </Link>
                  )}
                  <button type="button" style={dangerBtn} onClick={() => dismiss(n.id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.45rem 0.85rem',
        borderRadius: 999,
        border: active ? 'none' : '1px solid var(--upshd-border, #cbd5e1)',
        background: active ? 'var(--upshd-maroon, #7a0019)' : 'var(--upshd-surface, #fff)',
        color: active ? '#fff' : 'var(--upshd-text-muted, #475569)',
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  )
}

const card = { ...surfaceCardStyle, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const badge = { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', ...mutedTextStyle, letterSpacing: '0.04em' }
const primaryBtn = { ...primaryButtonStyle, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }
const ghostBtn = { ...ghostButtonStyle, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }
const dangerBtn = { ...ghostBtn, color: '#dc2626', borderColor: '#fecaca', fontSize: '0.8rem' }
