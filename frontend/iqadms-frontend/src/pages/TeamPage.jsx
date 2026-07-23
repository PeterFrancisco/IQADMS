import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

const PRESENCE = {
  online: { label: 'Online', color: '#22c55e' },
  away: { label: 'Away', color: '#eab308' },
  dnd: { label: 'Do Not Disturb', color: '#ef4444' },
  offline: { label: 'Offline', color: '#94a3b8' }
}

export default function TeamPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    try {
      setError('')
      const res = await api.get('/Profile/members')
      setMembers(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load team members.')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? members
    : members.filter(m => m.presence === filter)

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ marginBottom: '.25rem', color: '#1e3a8a' }}>Team</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          View members, their status, and open their profiles
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['all', 'online', 'away', 'dnd', 'offline'].map(key => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: filter === key ? '#1e3a8a' : '#e2e8f0',
                color: filter === key ? '#fff' : '#475569'
              }}
            >
              {key === 'all' ? 'All' : PRESENCE[key]?.label || key}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Loading team...</p>
        ) : error ? (
          <p style={{ color: '#dc2626' }}>{error}</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            No registered team members yet. Register accounts using your allowed emails first.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
            {filtered.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                onClick={() => navigate(`/team/${member.username}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function MemberCard({ member, onClick }) {
  const presence = PRESENCE[member.presence] || PRESENCE.offline
  const initials = (member.displayName || member.username || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,.08)',
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '999px',
            background: '#1e3a8a', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700
          }}>
            {initials}
          </div>
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12, borderRadius: '999px',
            background: presence.color,
            border: '2px solid #fff'
          }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#111827' }}>{member.displayName}</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>@{member.username}</div>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem' }}>
        {member.email}
      </div>

      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
        {member.position || 'No position set'}
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        fontSize: '0.8rem', fontWeight: 600, color: presence.color,
        marginBottom: '0.75rem'
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '999px', background: presence.color }} />
        {presence.label}
      </div>

      {member.bio && (
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.4 }}>
          {member.bio.length > 100 ? member.bio.slice(0, 100) + '...' : member.bio}
        </p>
      )}
    </div>
  )
}
