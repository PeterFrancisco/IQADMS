import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'

export default function MemberProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [workHistory, setWorkHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMember()
  }, [username])

  async function loadMember() {
    try {
        const [profileRes, historyRes] = await Promise.all([
        api.get(`/Profile/${username}`),
        api.get(`/Tasks/user/${username}/history`)
        ])
        setMember(profileRes.data)
        setWorkHistory(historyRes.data)
    } catch {
        setMember(null)
        setWorkHistory([])
    } finally {
        setLoading(false)
    }
  }   

  if (loading) {
    return (
      <DashboardLayout>
        <p>Loading profile...</p>
      </DashboardLayout>
    )
  }

  if (!member) {
    return (
      <DashboardLayout>
        <p>Member not found.</p>
        <button onClick={() => navigate('/team')} style={{ marginTop: '1rem', cursor: 'pointer' }}>
          ← Back to Team
        </button>
      </DashboardLayout>
    )
  }

  const initials = (member.displayName || username)
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate('/team')}
        style={{ border: 'none', background: 'none', color: upshd.maroon, cursor: 'pointer', marginBottom: '1rem', fontWeight: 600 }}
      >
        ← Back to Team
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '999px',
              background: upshd.maroon, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 700, margin: '0 auto 1rem'
            }}>
              {initials}
            </div>
            <h2 style={{ margin: '0 0 0.25rem', color: upshd.maroon }}>{member.displayName}</h2>
            <p style={{ margin: 0, color: '#64748b' }}>@{member.username}</p>
            <p style={{ marginTop: '0.5rem', color: '#475569' }}>{member.position}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {member.bio && (
            <Section title="About">
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{member.bio}</p>
            </Section>
          )}

            <Section title="Links">
              <LinkRow label="LinkedIn" url={member.linkedInUrl} />
              <LinkRow label="GitHub" url={member.gitHubUrl} />
              <LinkRow label="Instagram" url={member.instagramUrl} />
              <LinkRow label="Website" url={member.websiteUrl} />
            </Section>

            <Section title="Work History">
              {workHistory.length === 0 ? (
                <p style={{ margin: 0, color: '#94a3b8' }}>No completed tasks yet.</p>
              ) : (
                workHistory.map(item => (
                  <div
                    key={item.taskId}
                    style={{
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: upshd.maroon }}>{item.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Assigned by {item.createdByName || 'Unknown'}
                      {item.completedAt && (
                        <> · Completed {new Date(item.completedAt).toLocaleDateString()}</>
                      )}
                    </div>
                    {item.deliverableGoogleDriveLink && (
                      <a
                        href={item.deliverableGoogleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.85rem', color: upshd.maroonLight, marginTop: '0.35rem', display: 'inline-block' }}
                      >
                        View finished work
                      </a>
                    )}
                  </div>
                ))
            )}
          </Section>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      <h3 style={{ marginTop: 0, color: upshd.maroon }}>{title}</h3>
      {children}
    </div>
  )
}

function LinkRow({ label, url }) {
  if (!url) return null
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <strong>{label}: </strong>
      <a href={url} target="_blank" rel="noreferrer" style={{ color: upshd.maroonLight }}>{url}</a>
    </div>
  )
}