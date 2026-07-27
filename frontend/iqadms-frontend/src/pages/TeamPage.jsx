import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import AvatarWithPresence from '../components/AvatarWithPresence'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { isActivePresence, normalizePresence } from '../config/presence'

export default function TeamPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    const refresh = () => loadMembers()
    window.addEventListener('iqadms-presence-changed', refresh)
    return () => window.removeEventListener('iqadms-presence-changed', refresh)
  }, [])

  async function loadMembers() {
    try {
      setError('')
      const res = await api.get('/Profile/members')
      setMembers(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
      const status = err.response?.status
      if (status === 401) {
        setError('Your session expired. Sign in again.')
      } else if (status >= 500) {
        setError(
          'Could not load team members. If this started after an update, run database migrations on the server (dotnet ef database update).'
        )
      } else {
        setError('Failed to load team members.')
      }
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? members
    : members.filter(m =>
        filter === 'active'
          ? isActivePresence(m.presence)
          : !isActivePresence(m.presence)
      )

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ marginBottom: '.25rem', color: upshd.maroon }}>Team</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          View members and open their profiles. A green dot on the photo means they are active.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' }
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: filter === key ? upshd.maroon : '#e2e8f0',
                color: filter === key ? '#fff' : '#475569'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Loading team...</p>
        ) : error ? (
          <p style={{ color: '#dc2626' }}>{error}</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            {members.length === 0
              ? 'No registered team members yet. Register accounts using your allowed emails first.'
              : 'No members match this filter.'}
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
  const presence = normalizePresence(member.presence)
  const active = isActivePresence(presence)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
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
        <AvatarWithPresence member={{ ...member, presence }} size={48} />
        <div>
          <div style={{ fontWeight: 700, color: '#111827' }}>{member.displayName}</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>@{member.username}</div>
          <div style={{ fontSize: '0.8rem', color: active ? '#31a24c' : '#94a3b8', marginTop: '0.2rem' }}>
            {active ? 'Active now' : 'Inactive'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem' }}>
        {member.email}
      </div>

      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
        {member.position || 'No position set'}
      </div>

      {member.bio && (
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.4 }}>
          {member.bio.length > 100 ? member.bio.slice(0, 100) + '...' : member.bio}
        </p>
      )}
    </div>
  )
}
