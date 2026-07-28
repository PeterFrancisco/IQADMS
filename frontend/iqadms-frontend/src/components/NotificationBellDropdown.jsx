import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import api from '../services/api'
import '../theme/notification-bell.css'

const CATEGORY_LABEL = {
  task: 'Task',
  reminder: 'Due date',
  admin: 'Admin',
  announcement: 'Announcement'
}

function previewText(n) {
  const body = (n.body || '').trim()
  if (body) return body
  return (n.title || '').trim()
}

export default function NotificationBellDropdown() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const load = async () => {
    try {
      setLoading(true)
      const [listRes, countRes] = await Promise.all([
        api.get('/Notifications', { params: { unreadOnly: false } }),
        api.get('/Notifications/unread-count')
      ])
      setItems((listRes.data || []).slice(0, 20))
      setUnread(countRes.data?.count ?? 0)
    } catch {
      setItems([])
      setUnread(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const onChange = () => load()
    window.addEventListener('iqadms-notifications-changed', onChange)
    return () => window.removeEventListener('iqadms-notifications-changed', onChange)
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open])

  useEffect(() => {
    const onDoc = e => {
      if (ref.current?.contains(e.target)) return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function openItem(n) {
    try {
      if (!n.isRead) {
        await api.put(`/Notifications/${n.id}/read`)
        window.dispatchEvent(new Event('iqadms-notifications-changed'))
      }
    } catch {
      // ignore
    }
    setOpen(false)
    if (n.linkPath) navigate(n.linkPath)
  }

  return (
    <div className="notification-bell-wrap" ref={ref}>
      <button
        type="button"
        className={`notification-bell-btn ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden />
        {unread > 0 && (
          <span className="notification-bell-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      <div className={`notification-bell-panel ${open ? 'open' : ''}`}>
        <div className="notification-bell-panel-head">
          <strong>Notifications</strong>
          <button type="button" className="notification-bell-link" onClick={() => { setOpen(false); navigate('/notifications') }}>
            See all
          </button>
        </div>
        {loading ? (
          <p className="notification-bell-empty">Loading…</p>
        ) : items.length === 0 ? (
          <p className="notification-bell-empty">You&apos;re all caught up.</p>
        ) : (
          <ul className="notification-bell-list">
            {items.map(n => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notification-bell-item ${n.isRead ? 'read' : 'unread'}`}
                  onClick={() => openItem(n)}
                >
                  <span className="notification-bell-item-meta">
                    {CATEGORY_LABEL[n.category] || n.category}
                    {!n.isRead && <span className="notification-bell-unread-dot" aria-hidden />}
                  </span>
                  <span className="notification-bell-item-title">{n.title}</span>
                  <span className="notification-bell-item-preview">{previewText(n)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
