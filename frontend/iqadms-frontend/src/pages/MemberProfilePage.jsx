import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import AvatarWithPresence from '../components/AvatarWithPresence'
import { SocialLinksRow } from '../components/SocialLinks'
import api from '../services/api'
import ActivityStatusText from '../components/ActivityStatusText'
import { normalizePresence } from '../config/presence'
import '../theme/profile-page.css'
import {
  InfoRow,
  SectionCard,
  SidebarCard
} from './profileShared'

export default function MemberProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [workHistory, setWorkHistory] = useState([])
  const [memberAnnouncements, setMemberAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    loadMember()
  }, [username])

  useEffect(() => {
    const id = window.setInterval(() => loadMember(true), 25000)
    return () => clearInterval(id)
  }, [username])

  async function loadMember(silent = false) {
    try {
      if (!silent) setLoading(true)
      const [profileRes, historyRes, annRes] = await Promise.all([
        api.get(`/Profile/${username}`),
        api.get(`/Tasks/user/${username}/history`),
        api.get(`/Profile/${username}/announcements`)
      ])
      setMember(profileRes.data)
      setWorkHistory(historyRes.data)
      setMemberAnnouncements(annRes.data || [])
    } catch {
      setMember(null)
      setWorkHistory([])
      setMemberAnnouncements([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="profile-page">
          <div className="profile-loading-card">Loading profile...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!member) {
    return (
      <DashboardLayout>
        <div className="profile-page">
          <button type="button" className="profile-back-link" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="profile-loading-card">Member not found.</div>
        </div>
      </DashboardLayout>
    )
  }

  const displayName = member.displayName || member.username
  const presence = normalizePresence(member.presence)

  return (
    <DashboardLayout>
      <div className="profile-page">
        <button type="button" className="profile-back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="profile-hero">
          <div className="profile-hero-overlay" />
          <div className="profile-hero-content">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <AvatarWithPresence
                user={{
                  displayName,
                  username: member.username,
                  profilePictureUrl: member.profilePictureUrl,
                  presence,
                  lastActiveAt: member.lastActiveAt
                }}
                size={112}
              />
            </div>

            <div className="profile-hero-text">
              <h1 className="profile-hero-title">{displayName}</h1>
              <p className="profile-hero-sub">@{member.username}</p>
              <ActivityStatusText
                presence={presence}
                lastActiveAt={member.lastActiveAt}
                className="profile-header-activity hero-activity-on-dark"
              />
              {member.position && <p className="profile-hero-role">{member.position}</p>}
              <span className={`profile-role-badge ${member.isAdmin ? 'profile-role-badge--admin' : 'profile-role-badge--member'}`}>
                {member.isAdmin ? 'Administrator' : 'PQAD Staff'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <div className="profile-sidebar">
            <SidebarCard title="Contact">
              <InfoRow label="Email" value={member.email} />
              <InfoRow label="Username" value={`@${member.username}`} />
              {member.age != null && member.age !== '' && (
                <InfoRow label="Age" value={member.age} />
              )}
            </SidebarCard>

            <SidebarCard title="Social">
              <SocialLinksRow profile={member} size="sm" />
            </SidebarCard>

            <SidebarCard title="Completed tasks">
              <div className="profile-stat-number">{workHistory.length}</div>
              <div className="profile-stat-label">tasks in work history</div>
            </SidebarCard>
          </div>

          <div className="profile-main">
            <SectionCard title="About" subtitle="Public profile information">
              {member.bio ? (
                <p className="profile-bio-text">{member.bio}</p>
              ) : (
                <p className="profile-empty-text">No bio added yet.</p>
              )}
            </SectionCard>

            {member.websiteUrl && (
              <SectionCard title="Website">
                <a
                  href={member.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-history-link"
                  style={{ wordBreak: 'break-all' }}
                >
                  {member.websiteUrl}
                </a>
              </SectionCard>
            )}

            <SectionCard title="Announcements & meetings" subtitle="Published by this member">
              {memberAnnouncements.length === 0 ? (
                <p className="profile-empty-text">No announcements or meetings published yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {memberAnnouncements.map(a => (
                    <div key={a.id} className="profile-history-card">
                      <div className="profile-history-title">{a.title}</div>
                      <div className="profile-history-meta">
                        {a.category} · {a.startDate}
                        {a.location ? <> · {a.location}</> : null}
                      </div>
                      {a.description && (
                        <p className="profile-empty-text" style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>
                          {a.description.length > 120 ? `${a.description.slice(0, 120)}…` : a.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Work history" subtitle="Tasks completed as assignee">
              {workHistory.length === 0 ? (
                <p className="profile-empty-text">No completed tasks yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {workHistory.map(item => (
                    <div key={item.taskId} className="profile-history-card">
                      <div className="profile-history-title">{item.title}</div>
                      <div className="profile-history-meta">
                        Assigned by {item.createdByName || 'Unknown'}
                        {item.completedAt && (
                          <> · {new Date(item.completedAt).toLocaleDateString()}</>
                        )}
                      </div>
                      {item.deliverableGoogleDriveLink && (
                        <a
                          href={item.deliverableGoogleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-history-link"
                        >
                          View finished work →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
