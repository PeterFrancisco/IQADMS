import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import DashboardLayout from '../components/DashboardLayout'
import { upshd } from '../theme/upshd'

const API_ORIGIN = api.defaults.baseURL.replace(/\/api$/, '')

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [profilePictureUrl, setProfilePictureUrl] = useState('')
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
        website: res.data.websiteUrl || ''
      })
      setProfilePictureUrl(res.data.profilePictureUrl || '')
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
        websiteUrl: profile.website
      })
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
      const res = await api.post('/Profile/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfilePictureUrl(res.data.profilePictureUrl)
      flash('Profile photo updated.')
    } catch (err) {
      console.error(err)
      flash(err.response?.data?.message || 'Failed to upload photo.', true)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const initials = (profile.displayName || profile.username || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const avatarSrc = profilePictureUrl
    ? `${API_ORIGIN}${profilePictureUrl}`
    : null

  if (loading) {
    return (
      <DashboardLayout>
        <div style={styles.page}>
          <div style={styles.loadingCard}>Loading your profile...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div style={styles.page}>
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroOverlay} />
          <div style={styles.heroContent}>
            <div style={styles.avatarWrap}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatarFallback}>{initials}</div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={uploadPhoto}
              />
              <button
                type="button"
                style={styles.avatarBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Uploading...' : 'Change photo'}
              </button>
            </div>

            <div style={styles.heroText}>
              <h1 style={styles.heroTitle}>{profile.displayName || profile.username}</h1>
              <p style={styles.heroSub}>@{profile.username}</p>
              {profile.position && <p style={styles.heroRole}>{profile.position}</p>}
              <span style={{
                ...styles.badge,
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
            ...styles.alert,
            background: error ? '#fef2f2' : '#ecfdf5',
            color: error ? '#b91c1c' : '#047857',
            borderColor: error ? '#fecaca' : '#a7f3d0'
          }}>
            {error || message}
          </div>
        )}

        <div style={styles.grid}>
          {/* Left sidebar */}
          <div style={styles.sidebar}>
            <SidebarCard title="Contact">
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Username" value={`@${profile.username}`} />
              {profile.age !== '' && profile.age != null && (
                <InfoRow label="Age" value={profile.age} />
              )}
            </SidebarCard>

            <SidebarCard title="Quick links">
              <LinkChip label="LinkedIn" url={profile.linkedIn} />
              <LinkChip label="GitHub" url={profile.github} />
              <LinkChip label="Instagram" url={profile.instagram} />
              <LinkChip label="Website" url={profile.website} />
            </SidebarCard>

            <SidebarCard title="Completed tasks">
              <div style={styles.statNumber}>{workHistory.length}</div>
              <div style={styles.statLabel}>tasks in work history</div>
            </SidebarCard>
          </div>

          {/* Main */}
          <div style={styles.main}>
            <SectionCard
              title="Personal information"
              subtitle="Update how you appear to your team"
            >
              <div style={gridStyle}>
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
              <div style={{ display: 'grid', gap: '1rem' }}>
                <Input
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/yourname"
                  value={profile.linkedIn}
                  onChange={v => handleProfileChange('linkedIn', v)}
                />
                <Input
                  label="GitHub"
                  placeholder="https://github.com/yourname"
                  value={profile.github}
                  onChange={v => handleProfileChange('github', v)}
                />
                <Input
                  label="Instagram"
                  placeholder="https://instagram.com/yourusername"
                  value={profile.instagram}
                  onChange={v => handleProfileChange('instagram', v)}
                />
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
              <div style={gridStyle}>
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
              <div style={styles.hintBox}>
                <strong>Password requirements</strong>
                <ul style={styles.hintList}>
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
                <p style={styles.emptyText}>No completed tasks yet. Finish assigned tasks on Home to build your history.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {workHistory.map(item => (
                    <div key={item.taskId} style={styles.historyCard}>
                      <div style={styles.historyTitle}>{item.title}</div>
                      <div style={styles.historyMeta}>
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
                          style={styles.historyLink}
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

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={styles.card}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={styles.cardTitle}>{title}</h2>
        {subtitle && <p style={styles.cardSub}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function SidebarCard({ title, children }) {
  return (
    <div style={styles.sidebarCard}>
      <h3 style={styles.sidebarTitle}>{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  )
}

function LinkChip({ label, url }) {
  if (!url) {
    return (
      <div style={styles.linkChipEmpty}>
        <span>{label}</span>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Not set</span>
      </div>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={styles.linkChip}>
      {label} →
    </a>
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

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem'
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

const styles = {
  page: {
    maxWidth: 1100,
    margin: '0 auto'
  },
  loadingCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '2rem',
    textAlign: 'center',
    color: '#64748b',
    boxShadow: '0 2px 8px rgba(0,0,0,.06)'
  },
  hero: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: '1.5rem',
    background: upshd.heroGradient,
    minHeight: 180
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at top right, rgba(255,255,255,.15), transparent 55%)'
  },
  heroContent: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '1.5rem',
    padding: '1.75rem',
    flexWrap: 'wrap'
  },
  avatarWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  avatarImg: {
    width: 112,
    height: 112,
    borderRadius: '999px',
    objectFit: 'cover',
    border: '4px solid rgba(255,255,255,.9)',
    boxShadow: '0 8px 24px rgba(0,0,0,.2)'
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: '999px',
    background: 'rgba(255,255,255,.2)',
    border: '4px solid rgba(255,255,255,.9)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 700
  },
  avatarBtn: {
    padding: '0.4rem 0.75rem',
    borderRadius: 999,
    border: 'none',
    background: 'rgba(255,255,255,.95)',
    color: upshd.maroon,
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  heroText: {
    color: '#fff',
    paddingBottom: '0.25rem'
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700
  },
  heroSub: {
    margin: '0.25rem 0',
    opacity: 0.9
  },
  heroRole: {
    margin: '0.25rem 0 0.75rem',
    opacity: 0.85,
    fontSize: '0.95rem'
  },
  badge: {
    display: 'inline-block',
    padding: '0.3rem 0.75rem',
    borderRadius: 999,
    fontSize: '0.8rem',
    fontWeight: 600
  },
  alert: {
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 10,
    border: '1px solid',
    fontSize: '0.9rem',
    fontWeight: 500
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '1.5rem',
    alignItems: 'start'
  },
  sidebar: {
    display: 'grid',
    gap: '1rem'
  },
  sidebarCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,.06)'
  },
  sidebarTitle: {
    margin: '0 0 0.75rem',
    fontSize: '0.95rem',
    color: upshd.maroon,
    fontWeight: 700
  },
  main: {
    display: 'grid',
    gap: '1.25rem'
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,.06)'
  },
  cardTitle: {
    margin: 0,
    color: upshd.maroon,
    fontSize: '1.15rem'
  },
  cardSub: {
    margin: '0.35rem 0 0',
    color: '#64748b',
    fontSize: '0.9rem'
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  infoValue: {
    fontWeight: 600,
    color: '#111827',
    wordBreak: 'break-word'
  },
  linkChip: {
    display: 'block',
    padding: '0.55rem 0.75rem',
    marginBottom: '0.5rem',
    borderRadius: 8,
    background: upshd.linkBg,
    color: upshd.maroon,
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500
  },
  linkChipEmpty: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.55rem 0',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.9rem',
    color: '#475569'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 700,
    color: upshd.maroon
  },
  statLabel: {
    color: '#64748b',
    fontSize: '0.85rem'
  },
  hintBox: {
    marginTop: '1rem',
    padding: '1rem',
    borderRadius: 10,
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    fontSize: '0.9rem',
    color: '#475569'
  },
  hintList: {
    margin: '0.5rem 0 0 1.1rem',
    padding: 0
  },
  emptyText: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '0.95rem'
  },
  historyCard: {
    padding: '1rem',
    borderRadius: 12,
    background: '#f8fafc',
    border: '1px solid #e2e8f0'
  },
  historyTitle: {
    fontWeight: 600,
    color: upshd.maroon
  },
  historyMeta: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.25rem'
  },
  historyLink: {
    display: 'inline-block',
    marginTop: '0.5rem',
    fontSize: '0.85rem',
    color: upshd.maroonLight,
    fontWeight: 500,
    textDecoration: 'none'
  }
}
