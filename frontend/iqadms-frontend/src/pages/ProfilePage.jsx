import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import DashboardLayout from '../components/DashboardLayout'
import AvatarWithPresence from '../components/AvatarWithPresence'
import { SocialLinksEditorList, SocialLinksRow } from '../components/SocialLinks'
import { normalizePresence } from '../config/presence'
import { notifyProfileUpdated } from '../utils/profileEvents'
import { upshd } from '../theme/upshd'
import {
  InfoRow,
  SectionCard,
  SidebarCard,
  profileGridStyle,
  profileStyles
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
    website: ''
  })

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [workHistory, setWorkHistory] = useState([])

  useEffect(() => {
    loadProfile()
    const onPresence = e => {
      if (e.detail?.presence) setPresenceLocal(normalizePresence(e.detail.presence))
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
        website: res.data.websiteUrl || ''
      })
      setProfilePictureUrl(res.data.profilePictureUrl || '')
      setPresenceLocal(normalizePresence(res.data.presence))
      setAvatarKey(Date.now())
      setIsAdmin(!!res.data.isAdmin)
      localStorage.setItem('isAdmin', res.data.isAdmin ? 'true' : 'false')

      if (res.data.username) {
        const historyRes = await api.get(`/Tasks/user/${res.data.username}/history`)
        setWorkHistory(historyRes.data)
      } else {
        setWorkHistory([])
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load profile.')
      setWorkHistory([])
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
        websiteUrl: profile.website
      })
      notifyProfileUpdated()
      flash('Profile saved successfully.')
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

  const socialEditorUrls = {
    facebook: profile.facebook,
    instagram: profile.instagram,
    twitter: profile.twitter,
    linkedin: profile.linkedIn,
    github: profile.github
  }

  const onSocialEdit = (id, value) => {
    const fieldMap = {
      facebook: 'facebook',
      instagram: 'instagram',
      twitter: 'twitter',
      linkedin: 'linkedIn',
      github: 'github'
    }
    const field = fieldMap[id]
    if (field) handleProfileChange(field, value)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={profileStyles.page}>
          <div style={profileStyles.loadingCard}>Loading your profile...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div style={profileStyles.page}>
        {/* Hero */}
        <div style={profileStyles.hero}>
          <div style={profileStyles.heroOverlay} />
          <div style={profileStyles.heroContent}>
            <div style={profileStyles.avatarWrap}>
              <AvatarWithPresence
                user={{
                  displayName: profile.displayName,
                  username: profile.username,
                  profilePictureUrl,
                  presence
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
                style={profileStyles.avatarBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Uploading...' : 'Change photo'}
              </button>
            </div>

            <div style={profileStyles.heroText}>
              <h1 style={profileStyles.heroTitle}>{profile.displayName || profile.username}</h1>
              <p style={profileStyles.heroSub}>@{profile.username}</p>
              {profile.position && <p style={profileStyles.heroRole}>{profile.position}</p>}
              <span style={{
                ...profileStyles.badge,
                background: isAdmin ? upshd.maroonMuted : '#dcfce7',
                color: isAdmin ? upshd.maroon : '#166534'
              }}>
                {isAdmin ? 'Administrator' : 'PQAD Staff'}
              </span>
            </div>
          </div>
        </div>

        {(message || error) && (
          <div style={{
            ...profileStyles.alert,
            background: error ? '#fef2f2' : '#ecfdf5',
            color: error ? '#b91c1c' : '#047857',
            borderColor: error ? '#fecaca' : '#a7f3d0'
          }}>
            {error || message}
          </div>
        )}

        <div style={profileStyles.grid}>
          {/* Left sidebar */}
          <div style={profileStyles.sidebar}>
            <SidebarCard title="Contact">
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Username" value={`@${profile.username}`} />
              {profile.age !== '' && profile.age != null && (
                <InfoRow label="Age" value={profile.age} />
              )}
            </SidebarCard>

            <SidebarCard title="Social">
              <SocialLinksRow urls={socialEditorUrls} size="sm" />
            </SidebarCard>

            <SidebarCard title="Completed tasks">
              <div style={profileStyles.statNumber}>{workHistory.length}</div>
              <div style={profileStyles.statLabel}>tasks in work history</div>
            </SidebarCard>
          </div>

          {/* Main */}
          <div style={profileStyles.main}>
            <SectionCard
              title="Personal information"
              subtitle="Update how you appear to your team"
            >
              <div style={profileGridStyle}>
                <Input
                  label="Display name"
                  value={profile.displayName}
                  onChange={v => handleProfileChange('displayName', v)}
                />
                <Input
                  label="Position / role"
                  value={profile.position}
                  onChange={v => handleProfileChange('position', v)}
                  placeholder="e.g. QA Coordinator"
                />
                <Input
                  label="Age"
                  type="number"
                  value={profile.age}
                  onChange={v => handleProfileChange('age', v)}
                />
              </div>
              <div style={{ marginTop: '1rem' }}>
                <label style={labelStyle}>Bio</label>
                <textarea
                  rows="4"
                  value={profile.bio}
                  onChange={e => handleProfileChange('bio', e.target.value)}
                  style={textareaStyle}
                  placeholder="Tell your team a little about yourself..."
                />
              </div>
            </SectionCard>

            <SectionCard title="Social & portfolio links">
              <SocialLinksEditorList urls={socialEditorUrls} onEdit={onSocialEdit} />
              <div style={{ marginTop: '1rem' }}>
                <Input
                  label="Website / portfolio"
                  placeholder="https://yourwebsite.com"
                  value={profile.website}
                  onChange={v => handleProfileChange('website', v)}
                />
              </div>
              <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                <button onClick={saveProfile} disabled={saving} style={primaryButton}>
                  {saving ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Security">
              <div style={profileGridStyle}>
                <Input
                  label="Current password"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={v => handlePasswordChange('currentPassword', v)}
                />
                <div />
                <Input
                  label="New password"
                  type="password"
                  value={passwords.newPassword}
                  onChange={v => handlePasswordChange('newPassword', v)}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={v => handlePasswordChange('confirmPassword', v)}
                />
              </div>
              <div style={profileStyles.hintBox}>
                <strong>Password requirements</strong>
                <ul style={profileStyles.hintList}>
                  <li>At least 8 characters</li>
                  <li>Uppercase, lowercase, number, and special character</li>
                </ul>
              </div>
              <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                <button onClick={changePassword} disabled={saving} style={secondaryButton}>
                  Change password
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Work history" subtitle="Tasks you completed as assignee">
              {workHistory.length === 0 ? (
                <p style={profileStyles.emptyText}>No completed tasks yet. Finish assigned tasks on Home to build your history.</p>
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

function Input({ label, value, onChange, type = 'text', placeholder, readOnly = false }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        style={{
          ...inputStyle,
          background: readOnly ? '#f8fafc' : 'white',
          cursor: readOnly ? 'not-allowed' : 'text'
        }}
      />
    </div>
  )
}

const labelStyle = {
  display: 'block',
  marginBottom: '0.45rem',
  fontWeight: '600',
  color: '#374151',
  fontSize: '0.9rem'
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem 0.85rem',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  outline: 'none',
  fontSize: '0.95rem',
  boxSizing: 'border-box'
}

const textareaStyle = {
  width: '100%',
  padding: '0.85rem',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  outline: 'none',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  resize: 'vertical',
  fontFamily: 'inherit'
}

const primaryButton = {
  padding: '0.75rem 1.25rem',
  border: 'none',
  borderRadius: '10px',
  background: upshd.maroon,
  color: 'white',
  fontWeight: '600',
  cursor: 'pointer'
}

const secondaryButton = {
  ...primaryButton,
  background: upshd.maroonDark
}
