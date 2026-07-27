import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import AvatarWithPresence from '../components/AvatarWithPresence'
import { SocialLinksRow } from '../components/SocialLinks'
import api from '../services/api'
import ActivityStatusText from '../components/ActivityStatusText'
import { normalizePresence } from '../config/presence'
import { upshd } from '../theme/upshd'
import {
  InfoRow,
  SectionCard,
  SidebarCard,
  profileStyles
} from './profileShared'

export default function MemberProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [workHistory, setWorkHistory] = useState([])
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
      if (!silent) setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={profileStyles.page}>
          <div style={profileStyles.loadingCard}>Loading profile...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!member) {
    return (
      <DashboardLayout>
        <div style={profileStyles.page}>
          <button type="button" style={profileStyles.backLink} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div style={profileStyles.loadingCard}>Member not found.</div>
        </div>
      </DashboardLayout>
    )
  }

  const displayName = member.displayName || member.username
  const presence = normalizePresence(member.presence)

  return (
    <DashboardLayout>
      <div style={profileStyles.page}>
        <button type="button" style={profileStyles.backLink} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div style={profileStyles.hero}>
          <div style={profileStyles.heroOverlay} />
          <div style={profileStyles.heroContent}>
            <div style={profileStyles.avatarWrap}>
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

            <div style={profileStyles.heroText}>
              <h1 style={profileStyles.heroTitle}>{displayName}</h1>
              <p style={profileStyles.heroSub}>@{member.username}</p>
              <ActivityStatusText
                presence={presence}
                lastActiveAt={member.lastActiveAt}
                className="profile-header-activity hero-activity-on-dark"
              />
              {member.position && <p style={profileStyles.heroRole}>{member.position}</p>}
              <span style={{
                ...profileStyles.badge,
                background: member.isAdmin ? upshd.maroonMuted : '#dcfce7',
                color: member.isAdmin ? upshd.maroon : '#166534'
              }}>
                {member.isAdmin ? 'Administrator' : 'PQAD Staff'}
              </span>
            </div>
          </div>
        </div>

        <div style={profileStyles.grid}>
          <div style={profileStyles.sidebar}>
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
              <div style={profileStyles.statNumber}>{workHistory.length}</div>
              <div style={profileStyles.statLabel}>tasks in work history</div>
            </SidebarCard>
          </div>

          <div style={profileStyles.main}>
            <SectionCard title="About" subtitle="Public profile information">
              {member.bio ? (
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {member.bio}
                </p>
              ) : (
                <p style={profileStyles.emptyText}>No bio added yet.</p>
              )}
            </SectionCard>

            {member.websiteUrl && (
              <SectionCard title="Website">
                <a
                  href={member.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: upshd.maroon, fontWeight: 600, wordBreak: 'break-all' }}
                >
                  {member.websiteUrl}
                </a>
              </SectionCard>
            )}

            <SectionCard title="Work history" subtitle="Tasks completed as assignee">
              {workHistory.length === 0 ? (
                <p style={profileStyles.emptyText}>No completed tasks yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {workHistory.map(item => (
                    <div key={item.taskId} style={profileStyles.historyCard}>
                      <div style={profileStyles.historyTitle}>{item.title}</div>
                      <div style={profileStyles.historyMeta}>
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
                          style={profileStyles.historyLink}
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
