import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import DashboardLayout from '../components/DashboardLayout'
import AppModal from '../components/AppModal'
import AvatarWithPresence from '../components/AvatarWithPresence'
import { SocialLinksEditorList, SocialLinksRow } from '../components/SocialLinks'
import { normalizePresence } from '../config/presence'
import ActivityStatusText from '../components/ActivityStatusText'
import { notifyProfileUpdated } from '../utils/profileEvents'
import '../theme/profile-page.css'
import {
  InfoRow,
  SectionCard,
  SidebarCard,
  profileGridStyle
} from './profileShared'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [profilePictureUrl, setProfilePictureUrl] = useState('')
  const [avatarKey, setAvatarKey] = useState(0)
  const [presence, setPresenceLocal] = useState('offline')
  const [lastActiveAt, setLastActiveAt] = useState(null)
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    email: '',
    position: '',
    age: '',
    bio: '',
    linkedIn: '',
    github: '',
    instagram: '',
    facebook: '',
    twitter: '',
    website: '',
    facebookDisplay: '',
    instagramDisplay: '',
    twitterDisplay: '',
    linkedInDisplay: '',
    githubDisplay: ''
  })

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [workHistory, setWorkHistory] = useState([])
  const [myAnnouncements, setMyAnnouncements] = useState([])
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    loadProfile()
    const onPresence = e => {
      if (e.detail?.presence) setPresenceLocal(normalizePresence(e.detail.presence))
      if (e.detail?.lastActiveAt) setLastActiveAt(e.detail.lastActiveAt)
    }
    window.addEventListener('iqadms-presence-changed', onPresence)
    return () => window.removeEventListener('iqadms-presence-changed', onPresence)
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/Profile/me')

      setProfile({
        displayName: res.data.displayName || '',
        username: res.data.username || '',
        email: res.data.email || '',
        position: res.data.position || '',
        age: res.data.age ?? '',
        bio: res.data.bio || '',
        linkedIn: res.data.linkedInUrl || '',
        github: res.data.gitHubUrl || '',
        instagram: res.data.instagramUrl || '',
        facebook: res.data.facebookUrl || '',
        twitter: res.data.twitterUrl || '',
        website: res.data.websiteUrl || '',
        facebookDisplay: res.data.facebookDisplayName || '',
        instagramDisplay: res.data.instagramDisplayName || '',
        twitterDisplay: res.data.twitterDisplayName || '',
        linkedInDisplay: res.data.linkedInDisplayName || '',
        githubDisplay: res.data.gitHubDisplayName || ''
      })
      setProfilePictureUrl(res.data.profilePictureUrl || '')
      setPresenceLocal(normalizePresence(res.data.presence))
      setLastActiveAt(res.data.lastActiveAt || null)
      setAvatarKey(Date.now())
      setIsAdmin(!!res.data.isAdmin)
      localStorage.setItem('isAdmin', res.data.isAdmin ? 'true' : 'false')

      if (res.data.username) {
        const [historyRes, annRes] = await Promise.all([
          api.get(`/Tasks/user/${res.data.username}/history`),
          api.get(`/Profile/${res.data.username}/announcements`)
        ])
        setWorkHistory(historyRes.data)
        setMyAnnouncements(annRes.data || [])
      } else {
        setWorkHistory([])
        setMyAnnouncements([])
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load profile.')
      setWorkHistory([])
      setMyAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field, value) => {
    setPasswords(prev => ({ ...prev, [field]: value }))
  }

  const flash = (text, isError = false) => {
    if (isError) {
      setError(text)
      setMessage('')
    } else {
      setMessage(text)
      setError('')
    }
    setTimeout(() => {
      setMessage('')
      setError('')
    }, 3500)
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      await api.put('/Profile/me', {
        displayName: profile.displayName,
        position: profile.position,
        age: profile.age ? Number(profile.age) : null,
        bio: profile.bio,
        linkedInUrl: profile.linkedIn,
        gitHubUrl: profile.github,
        instagramUrl: profile.instagram,
        facebookUrl: profile.facebook,
        twitterUrl: profile.twitter,
        websiteUrl: profile.website,
        facebookDisplayName: profile.facebookDisplay,
        instagramDisplayName: profile.instagramDisplay,
        twitterDisplayName: profile.twitterDisplay,
        linkedInDisplayName: profile.linkedInDisplay,
        gitHubDisplayName: profile.githubDisplay
      })
      notifyProfileUpdated()
      flash('Profile saved successfully.')
      setEditOpen(false)
    } catch (err) {
      console.error(err)
      flash(err.response?.data?.message || 'Failed to update profile.', true)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      flash('New passwords do not match.', true)
      return
    }

    try {
      setSaving(true)
      await api.post('/Profile/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword
      })
      flash('Password changed successfully.')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      console.error(err)
      flash(err.response?.data?.message || 'Failed to change password.', true)
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      flash('Please choose an image file.', true)
      return
    }

    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/Profile/me/avatar', formData)
      setProfilePictureUrl(res.data.profilePictureUrl)
      setAvatarKey(Date.now())
      notifyProfileUpdated({ profilePictureUrl: res.data.profilePictureUrl })
      flash('Profile photo updated.')
    } catch (err) {
      console.error(err)
      flash(err.response?.data?.message || 'Failed to upload photo.', true)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const socialEditorLinks = {
    facebook: { display: profile.facebookDisplay, url: profile.facebook },
    instagram: { display: profile.instagramDisplay, url: profile.instagram },
    twitter: { display: profile.twitterDisplay, url: profile.twitter },
    linkedin: { display: profile.linkedInDisplay, url: profile.linkedIn },
    github: { display: profile.githubDisplay, url: profile.github }
  }

  const onSocialEdit = (id, field, value) => {
    const map = {
      facebook: { display: 'facebookDisplay', url: 'facebook' },
      instagram: { display: 'instagramDisplay', url: 'instagram' },
      twitter: { display: 'twitterDisplay', url: 'twitter' },
      linkedin: { display: 'linkedInDisplay', url: 'linkedIn' },
      github: { display: 'githubDisplay', url: 'github' }
    }
    const key = map[id]?.[field]
    if (key) handleProfileChange(key, value)
  }

  const socialSidebarProfile = {
    facebookUrl: profile.facebook,
    instagramUrl: profile.instagram,
    twitterUrl: profile.twitter,
    linkedInUrl: profile.linkedIn,
    gitHubUrl: profile.github,
    facebookDisplayName: profile.facebookDisplay,
    instagramDisplayName: profile.instagramDisplay,
    twitterDisplayName: profile.twitterDisplay,
    linkedInDisplayName: profile.linkedInDisplay,
    gitHubDisplayName: profile.githubDisplay
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="profile-page">
          <div className="profile-loading-card">Loading your profile...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="profile-page">
        <div className="profile-hero">
          <div className="profile-hero-overlay" />
          <div className="profile-hero-content">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <AvatarWithPresence
                user={{
                  displayName: profile.displayName,
                  username: profile.username,
                  profilePictureUrl,
                  presence,
                  lastActiveAt
                }}
                size={112}
                cacheKey={avatarKey}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={uploadPhoto}
              />
              <button
                type="button"
                className="profile-avatar-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Uploading...' : 'Change photo'}
              </button>
            </div>

            <div className="profile-hero-text">
              <h1 className="profile-hero-title">{profile.displayName || profile.username}</h1>
              <p className="profile-hero-sub">@{profile.username}</p>
              <ActivityStatusText
                presence={presence}
                lastActiveAt={lastActiveAt}
                className="profile-header-activity hero-activity-on-dark"
              />
              {profile.position && <p className="profile-hero-role">{profile.position}</p>}
              <span className={`profile-role-badge ${isAdmin ? 'profile-role-badge--admin' : 'profile-role-badge--member'}`}>
                {isAdmin ? 'Administrator' : 'PQAD Staff'}
              </span>
              <div style={{ marginTop: '0.85rem' }}>
                <button type="button" className="profile-primary-btn" onClick={() => setEditOpen(true)}>
                  Edit profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {(message || error) && (
          <div className={`profile-alert ${error ? 'profile-alert--error' : 'profile-alert--success'}`}>
            {error || message}
          </div>
        )}

        <div className="profile-layout">
          <div className="profile-sidebar">
            <SidebarCard title="Contact">
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Username" value={`@${profile.username}`} />
              {profile.age !== '' && profile.age != null && (
                <InfoRow label="Age" value={profile.age} />
              )}
            </SidebarCard>

            <SidebarCard title="Social">
              <SocialLinksRow profile={socialSidebarProfile} size="sm" />
            </SidebarCard>

            <SidebarCard title="Completed tasks">
              <div className="profile-stat-number">{workHistory.length}</div>
              <div className="profile-stat-label">tasks in work history</div>
            </SidebarCard>
          </div>

          <div className="profile-main">
            <SectionCard title="About" subtitle="How you appear to your team">
              {profile.bio ? (
                <p className="profile-bio-text">{profile.bio}</p>
              ) : (
                <p className="profile-empty-text">No bio yet. Use Edit profile to add one.</p>
              )}
              <div style={{ ...profileGridStyle, marginTop: '1rem' }}>
                <InfoRow label="Display name" value={profile.displayName} />
                <InfoRow label="Position" value={profile.position} />
                {profile.age !== '' && profile.age != null && <InfoRow label="Age" value={profile.age} />}
                <InfoRow label="Website" value={profile.website} />
              </div>
            </SectionCard>

            <SectionCard title="Announcements & meetings" subtitle="Items you published">
              {myAnnouncements.length === 0 ? (
                <p className="profile-empty-text">No announcements or meetings published yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {myAnnouncements.map(a => (
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

            <SectionCard title="Work history" subtitle="Tasks you completed as assignee">
              {workHistory.length === 0 ? (
                <p className="profile-empty-text">No completed tasks yet. Finish assigned tasks on Home to build your history.</p>
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

        <AppModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit profile"
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="profile-secondary-btn" onClick={() => setEditOpen(false)}>Cancel</button>
              <button type="button" className="profile-primary-btn" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div style={profileGridStyle}>
              <Input label="Display name" value={profile.displayName} onChange={v => handleProfileChange('displayName', v)} />
              <Input label="Position / role" value={profile.position} onChange={v => handleProfileChange('position', v)} placeholder="e.g. QA Coordinator" />
              <Input label="Age" type="number" value={profile.age} onChange={v => handleProfileChange('age', v)} />
            </div>
            <div>
              <label className="profile-field-label">Bio</label>
              <textarea rows="4" value={profile.bio} onChange={e => handleProfileChange('bio', e.target.value)} className="profile-field-textarea" placeholder="Tell your team a little about yourself..." />
            </div>
            <SocialLinksEditorList links={socialEditorLinks} onEdit={onSocialEdit} />
            <Input label="Website / portfolio" placeholder="https://yourwebsite.com" value={profile.website} onChange={v => handleProfileChange('website', v)} />
            <div style={{ borderTop: '1px solid var(--upshd-border, #e2e8f0)', paddingTop: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--upshd-maroon, #7a0019)' }}>Change password</h3>
              <div style={profileGridStyle}>
                <Input label="Current password" type="password" value={passwords.currentPassword} onChange={v => handlePasswordChange('currentPassword', v)} />
                <div />
                <Input label="New password" type="password" value={passwords.newPassword} onChange={v => handlePasswordChange('newPassword', v)} />
                <Input label="Confirm new password" type="password" value={passwords.confirmPassword} onChange={v => handlePasswordChange('confirmPassword', v)} />
              </div>
              <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                <button type="button" onClick={changePassword} disabled={saving} className="profile-secondary-btn">Update password</button>
              </div>
            </div>
          </div>
        </AppModal>
      </div>
    </DashboardLayout>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder, readOnly = false }) {
  return (
    <div>
      <label className="profile-field-label">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        className="profile-field-input"
      />
    </div>
  )
}

