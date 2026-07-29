import './DashboardLayout.css'
import React, { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import AppIcon from './AppIcon'
import AvatarWithPresence from './AvatarWithPresence'
import ActivityStatusText from './ActivityStatusText'
import { setPresence, startPresenceHeartbeat } from '../utils/presenceApi'
import { Menu } from 'lucide-react'
import IqadmsLogo from './IqadmsLogo'
import NotificationBellDropdown from './NotificationBellDropdown'
import { clearAuthSession } from '../utils/authSession'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  )
  const [unreadNotifications, setUnreadNotifications] = React.useState(0)
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const closeMobile = () => closeSidebarMobile(setSidebarOpen)

  useEffect(() => {
    loadUnreadCount()
    const onChange = () => loadUnreadCount()
    window.addEventListener('iqadms-notifications-changed', onChange)
    const heartbeatId = startPresenceHeartbeat()
    return () => {
      window.removeEventListener('iqadms-notifications-changed', onChange)
      clearInterval(heartbeatId)
    }
  }, [])

  async function loadUnreadCount() {
    try {
      const res = await api.get('/Notifications/unread-count')
      setUnreadNotifications(res.data.count ?? 0)
    } catch {
      setUnreadNotifications(0)
    }
  }

  return (
    <div className="layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Link to="/" className="sidebar-brand sidebar-brand-link" onClick={closeMobile}>
          <IqadmsLogo size={36} wordmarkLayout="stack" />
        </Link>

        <NavItem label="Home" to="/" icon="home" onNavigate={closeMobile} />
        <NavItem label="Dashboard" to="/dashboard" icon="dashboard" onNavigate={closeMobile} />
        <NavItem label={isAdmin ? 'Tasks' : 'My Tasks'} to="/my-tasks" icon="tasks" onNavigate={closeMobile} />
        {isAdmin && (
          <>
            <NavItem label="Projects" to="/projects" icon="projects" onNavigate={closeMobile} />
            <NavItem label="Documents" to="/documents" icon="documents" onNavigate={closeMobile} />
          </>
        )}
        <NavItem label="Calendar" to="/calendar" icon="calendar" onNavigate={closeMobile} />
        <NavItem label="Announcements" to="/announcements" icon="announcements" onNavigate={closeMobile} />
        {isAdmin && (
          <NavItem label="Analytics" to="/analytics" icon="analytics" onNavigate={closeMobile} />
        )}

        <div className="sidebar-divider" />

        <NavItem label="Notifications" to="/notifications" icon="notifications" badge={unreadNotifications} onNavigate={closeMobile} />
        <TeamMembersDropdown label="PQAD Team" icon="team" onNavigate={closeMobile} />

        {isAdmin && (
          <>
            <div className="sidebar-divider" />
            <NavItem label="Account Requests" to="/settings" icon="account-requests" onNavigate={closeMobile} />
            <NavItem label="Add Account" to="/admin/add-account" icon="add-account" onNavigate={closeMobile} />
            <NavItem label="Manage Users" to="/admin/manage-users" icon="manage-users" onNavigate={closeMobile} />
          </>
        )}
      </aside>

      <main className={`main ${sidebarOpen ? 'main-shifted' : ''}`}>
        <header className="main-header">
          <div className="main-header-left">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={22} strokeWidth={1.75} aria-hidden />
            </button>
            <h2 className="main-title">IQADMS</h2>
          </div>
          <div className="main-header-actions">
            <NotificationBellDropdown />
            <ProfileMenu />
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}

function closeSidebarMobile(setSidebarOpen) {
  if (window.innerWidth < 1024) setSidebarOpen(false)
}

function NavItem({ label, to, icon, onNavigate, matchPrefix, badge = 0 }) {
  const location = useLocation()
  const active = matchPrefix
    ? location.pathname.startsWith(matchPrefix)
    : location.pathname === to

  return (
    <Link to={to} className="nav-item-link" onClick={onNavigate}>
      <div className={`nav-item ${active ? 'active' : ''}`}>
        <span className="nav-item-icon">
          <AppIcon name={icon} size={20} />
        </span>
        <span className="nav-item-label">{label}</span>
        {badge > 0 && (
          <span className="nav-badge" aria-label={`${badge} unread notifications`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    </Link>
  )
}

function TeamMembersDropdown({ label, icon, onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = React.useState(false)
  const [members, setMembers] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const ref = useRef(null)

  const isActive = /^\/team\/[^/]+/.test(location.pathname)

  useEffect(() => {
    if (open) loadMembers()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const id = window.setInterval(() => loadMembers(), 20000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    const refresh = () => {
      if (open) loadMembers()
    }
    window.addEventListener('iqadms-presence-changed', refresh)
    return () => window.removeEventListener('iqadms-presence-changed', refresh)
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function loadMembers() {
    setLoading(true)
    try {
      const res = await api.get('/Profile/members')
      setMembers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openProfile(username) {
    setOpen(false)
    onNavigate?.()
    navigate(`/team/${username}`)
  }

  return (
    <div ref={ref}>
      <div
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(!open)}
      >
        <span className="nav-item-icon">
          <AppIcon name={icon} size={20} />
        </span>
        <span className="nav-item-label">{label}</span>
        <span className={`nav-chevron ${open ? 'rotated' : ''}`}>▼</span>
      </div>

      <div className={`team-panel ${open ? 'open' : ''}`}>
        {loading ? (
          <div className="team-loading">Loading...</div>
        ) : members.length === 0 ? (
          <div className="team-empty">No members found</div>
        ) : (
          members.map(member => {
            const presence = normalizePresence(member.presence)
            const isSelected = location.pathname === `/team/${member.username}`

            return (
              <div
                key={member.id}
                className={`team-member ${isSelected ? 'selected' : ''}`}
                onClick={() => openProfile(member.username)}
              >
                <AvatarWithPresence
                  member={{ ...member, presence, lastActiveAt: member.lastActiveAt }}
                  size={32}
                  className="team-member-avatar"
                />
                <div className="team-member-text">
                  <div className="team-member-name">{member.displayName || member.username}</div>
                  <div className="team-member-user">@{member.username}</div>
                  <ActivityStatusText
                    presence={presence}
                    lastActiveAt={member.lastActiveAt}
                    className="team-member-activity"
                  />
                </div>
              </div>
            )
          })
        )}

      </div>
    </div>
  )
}

function ProfileMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [me, setMe] = React.useState(null)
  const [avatarKey, setAvatarKey] = React.useState(0)
  const [, setActivityTick] = React.useState(0)
  const ref = useRef(null)
  const username = localStorage.getItem('username') || 'admin'
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const displayName = me?.displayName || username
  const email = me?.email || ''
  const initials = (displayName || username).slice(0, 2).toUpperCase()

  const loadMe = React.useCallback(async () => {
    try {
      const res = await api.get('/Profile/me')
      setMe(res.data)
      setAvatarKey(Date.now())
    } catch {
      setMe(null)
    }
  }, [])

  React.useEffect(() => {
    loadMe()
    const onUpdate = () => loadMe()
    const onPresence = e => {
      setMe(prev =>
        prev
          ? {
              ...prev,
              presence: e.detail?.presence ?? prev.presence,
              lastActiveAt: e.detail?.lastActiveAt ?? prev.lastActiveAt
            }
          : prev
      )
    }
    window.addEventListener('iqadms-profile-updated', onUpdate)
    window.addEventListener('iqadms-presence-changed', onPresence)
    return () => {
      window.removeEventListener('iqadms-profile-updated', onUpdate)
      window.removeEventListener('iqadms-presence-changed', onPresence)
    }
  }, [loadMe])

  React.useEffect(() => {
    const id = window.setInterval(() => setActivityTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [])

  const logout = async () => {
    try {
      await setPresence('offline')
    } catch {
      // ignore
    }
    try {
      await api.post('/Auth/logout')
    } catch {
      // ignore
    }
    clearAuthSession()
    navigate('/login')
  }

  const go = (path) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="topbar" ref={ref}>
      <button
        type="button"
        className={`avatar-btn ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        title={displayName}
      >
        {me ? (
          <AvatarWithPresence
            user={{
              ...me,
              displayName: me.displayName || username,
              presence: normalizePresence(me.presence),
              lastActiveAt: me.lastActiveAt
            }}
            size={40}
            cacheKey={avatarKey}
            className="avatar-btn-inner"
          />
        ) : (
          initials
        )}
      </button>

      <div className={`profile-menu ${open ? 'open' : ''}`}>
        <div className="profile-header">
          <strong>{displayName}</strong>
          {email ? (
            <small className="profile-header-email" title={email}>
              {email}
            </small>
          ) : null}
          {me ? (
            <ActivityStatusText
              presence={normalizePresence(me.presence)}
              lastActiveAt={me.lastActiveAt}
              className="profile-header-activity"
            />
          ) : null}
          <small className="profile-header-role">{isAdmin ? 'Administrator' : 'PQAD Staff'}</small>
        </div>

        <button type="button" className="menu-item" onClick={() => go('/profile')}>
          <AppIcon name="profile" size={18} /> Profile
        </button>

        {isAdmin ? (
          <>
            <button type="button" className="menu-item" onClick={() => go('/admin/add-account')}>
              <AppIcon name="add-account" size={18} /> Add Account
            </button>
            <button type="button" className="menu-item" onClick={() => go('/admin/manage-users')}>
              <AppIcon name="manage-users" size={18} /> Manage Users
            </button>
            <button type="button" className="menu-item" onClick={() => go('/settings')}>
              <AppIcon name="account-requests" size={18} /> Account Requests
            </button>
          </>
        ) : (
          <>
            <button type="button" className="menu-item" onClick={() => go('/report/bug')}>
              <AppIcon name="bug" size={18} /> Report a Bug
            </button>
            <button type="button" className="menu-item" onClick={() => go('/report/feedback')}>
              <AppIcon name="feedback" size={18} /> Give Feedback
            </button>
          </>
        )}

        <div className="menu-divider" />
        <button type="button" className="menu-item danger" onClick={logout}>
          <AppIcon name="logout" size={18} /> Logout
        </button>
      </div>
    </div>
  )
}
