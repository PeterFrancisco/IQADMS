import './DashboardLayout.css'
import React, { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  )
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const closeMobile = () => closeSidebarMobile(setSidebarOpen)

  return (
    <div className="layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h2>IQADMS</h2>
          <small>PQAD · UPSHD Molino</small>
        </div>

        <NavItem label="Dashboard" to="/dashboard" icon="📊" onNavigate={closeMobile} />
        <NavItem label="My Tasks" to="/my-tasks" icon="✅" onNavigate={closeMobile} />
        <NavItem label="Projects" to="/projects" icon="📁" onNavigate={closeMobile} />
        <NavItem label="Documents" to="/documents" icon="📄" onNavigate={closeMobile} />
        <NavItem label="Monitoring" to="/monitoring" icon="📈" onNavigate={closeMobile} />
        <NavItem label="Calendar" to="/calendar" icon="📅" onNavigate={closeMobile} />
        <NavItem label="Reports" to="/reports" icon="📑" onNavigate={closeMobile} />

        <div className="sidebar-divider" />

        <NavItem label="Notifications" to="/notifications" icon="🔔" onNavigate={closeMobile} />
        <TeamMembersDropdown label="PQAD Team" icon="👥" onNavigate={closeMobile} />

        <div className="sidebar-divider" />

        <NavItem label="Activities" to="/activities" icon="📋" onNavigate={closeMobile} />
        <NavItem label="Departments" to="/departments" icon="🏢" onNavigate={closeMobile} />

        {isAdmin && (
          <>
            <div className="sidebar-divider" />
            <NavItem label="Account Requests" to="/settings" icon="📬" onNavigate={closeMobile} />
            <NavItem label="Add Account" to="/admin/add-account" icon="➕" onNavigate={closeMobile} />
            <NavItem label="Manage Users" to="/admin/manage-users" icon="⚙️" onNavigate={closeMobile} />
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
              ☰
            </button>
            <h2 className="main-title">IQADMS</h2>
          </div>
          <ProfileMenu />
        </header>
        {children}
      </main>
    </div>
  )
}

function closeSidebarMobile(setSidebarOpen) {
  if (window.innerWidth < 1024) setSidebarOpen(false)
}

function NavItem({ label, to, icon, onNavigate, matchPrefix }) {
  const location = useLocation()
  const active = matchPrefix
    ? location.pathname.startsWith(matchPrefix)
    : location.pathname === to

  return (
    <Link to={to} className="nav-item-link" onClick={onNavigate}>
      <div className={`nav-item ${active ? 'active' : ''}`}>
        <span className="nav-item-icon">{icon}</span>
        <span className="nav-item-label">{label}</span>
      </div>
    </Link>
  )
}

const PRESENCE = {
  online: { label: 'Online', color: '#22c55e' },
  away: { label: 'Away', color: '#eab308' },
  dnd: { label: 'Do Not Disturb', color: '#ef4444' },
  offline: { label: 'Offline', color: '#94a3b8' }
}

function TeamMembersDropdown({ label, icon, onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = React.useState(false)
  const [members, setMembers] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const ref = useRef(null)

  const isActive = location.pathname.startsWith('/team')

  useEffect(() => {
    if (open) loadMembers()
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
        <span className="nav-item-icon">{icon}</span>
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
            const presence = PRESENCE[member.presence] || PRESENCE.offline
            const isSelected = location.pathname === `/team/${member.username}`

            return (
              <div
                key={member.id}
                className={`team-member ${isSelected ? 'selected' : ''}`}
                onClick={() => openProfile(member.username)}
              >
                <div>
                  <div className="team-member-name">{member.displayName || member.username}</div>
                  <div className="team-member-user">@{member.username}</div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  color: presence.color,
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '999px',
                    background: presence.color
                  }} />
                  {presence.label}
                </div>
              </div>
            )
          })
        )}

        <div
          className="team-footer"
          onClick={() => {
            setOpen(false)
            onNavigate?.()
            navigate('/profile')
          }}
        >
          👤 My Profile
        </div>
      </div>
    </div>
  )
}

function ProfileMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const ref = useRef(null)
  const username = localStorage.getItem('username') || 'admin'
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const initials = username.slice(0, 2).toUpperCase()

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

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('userId')
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
      >
        {initials}
      </button>

      <div className={`profile-menu ${open ? 'open' : ''}`}>
        <div className="profile-header">
          <strong>{username}</strong>
          <small>{isAdmin ? 'Administrator' : 'PQAD Staff'}</small>
        </div>

        <button type="button" className="menu-item" onClick={() => go('/profile')}>
          <span>👤</span> Profile
        </button>

        {isAdmin ? (
          <>
            <button type="button" className="menu-item" onClick={() => go('/admin/add-account')}>
              <span>➕</span> Add Account
            </button>
            <button type="button" className="menu-item" onClick={() => go('/admin/manage-users')}>
              <span>⚙️</span> Manage Users
            </button>
            <button type="button" className="menu-item" onClick={() => go('/settings')}>
              <span>📬</span> Account Requests
            </button>
          </>
        ) : (
          <>
            <button type="button" className="menu-item" onClick={() => go('/report/bug')}>
              <span>🐞</span> Report a Bug
            </button>
            <button type="button" className="menu-item" onClick={() => go('/report/feedback')}>
              <span>💬</span> Give Feedback
            </button>
          </>
        )}

        <div className="menu-divider" />
        <button type="button" className="menu-item danger" onClick={logout}>
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  )
}
