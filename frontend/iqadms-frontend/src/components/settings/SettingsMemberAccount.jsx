import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { appDialog } from '../../utils/appDialog'
import { clearAuthSession } from '../../utils/authSession'

export default function SettingsMemberAccount() {
  const navigate = useNavigate()
  const username = localStorage.getItem('username') || ''
  const [email, setEmail] = useState('')
  const [currentEmail, setCurrentEmail] = useState('')
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [emailPassword, setEmailPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/Profile/me').then(res => {
      setCurrentEmail(res.data?.email || '')
    }).catch(() => {})
  }, [])

  async function changePassword(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      await api.post('/Profile/change-password', passwords)
      await appDialog.alert('Password changed successfully.')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      await appDialog.alert({ message: err.response?.data?.message || 'Failed to change password.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function changeEmail(e) {
    e.preventDefault()
    if (loading || !email.trim()) return
    setLoading(true)
    try {
      await api.post('/Profile/me/change-email', {
        newEmail: email.trim(),
        currentPassword: emailPassword
      })
      await appDialog.alert('Email updated successfully.')
      setCurrentEmail(email.trim())
      setEmail('')
      setEmailPassword('')
    } catch (err) {
      await appDialog.alert({ message: err.response?.data?.message || 'Failed to update email.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function requestPasswordReset() {
    setResetMsg('')
    try {
      const res = await api.post('/Auth/forgot-password', { emailOrUsername: username })
      setResetMsg(res.data?.message || 'Request submitted. An admin will review it.')
    } catch (err) {
      setResetMsg(err.response?.data?.message || 'Could not submit request.')
    }
  }

  async function deleteAccount() {
    if (
      !(await appDialog.confirm({
        title: 'Delete account',
        message: 'This permanently removes your account. You will be signed out.',
        confirmLabel: 'Delete my account',
        danger: true
      }))
    )
      return

    setLoading(true)
    try {
      await api.delete('/Profile/me', {
        data: { currentPassword: deletePassword, confirmText: deleteConfirm }
      })
      clearAuthSession()
      navigate('/login')
    } catch (err) {
      await appDialog.alert({ message: err.response?.data?.message || 'Failed to delete account.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-stack">
      <SettingsCard title="Edit profile" description="Update your display name, bio, avatar, and social links.">
        <Link to="/profile" className="settings-link-btn">Open profile editor</Link>
      </SettingsCard>

      <SettingsCard title="Change password" description="Update your sign-in password.">
        <form onSubmit={changePassword} className="settings-form">
          <Field label="Current password" type="password" value={passwords.currentPassword} onChange={v => setPasswords(p => ({ ...p, currentPassword: v }))} />
          <Field label="New password" type="password" value={passwords.newPassword} onChange={v => setPasswords(p => ({ ...p, newPassword: v }))} />
          <Field label="Confirm new password" type="password" value={passwords.confirmPassword} onChange={v => setPasswords(p => ({ ...p, confirmPassword: v }))} />
          <button type="submit" disabled={loading} className="settings-primary-btn">Save password</button>
        </form>
      </SettingsCard>

      <SettingsCard title="Change email" description={currentEmail ? `Current: ${currentEmail}` : 'Update the email on your account.'}>
        <form onSubmit={changeEmail} className="settings-form">
          <Field label="New email" type="email" value={email} onChange={setEmail} required />
          <Field label="Current password" type="password" value={emailPassword} onChange={setEmailPassword} />
          <button type="submit" disabled={loading} className="settings-primary-btn">Update email</button>
        </form>
      </SettingsCard>

      <SettingsCard title="Forgot password" description="Ask an administrator to email you a reset link.">
        <button type="button" className="settings-secondary-btn" onClick={requestPasswordReset}>
          Request password reset
        </button>
        {resetMsg ? <p className="settings-hint">{resetMsg}</p> : null}
      </SettingsCard>

      <SettingsCard title="Delete account" description="Permanently remove your IQADMS account. Type DELETE and enter your password." danger>
        <div className="settings-form">
          <Field label="Type DELETE" value={deleteConfirm} onChange={setDeleteConfirm} />
          <Field label="Current password" type="password" value={deletePassword} onChange={setDeletePassword} />
          <button type="button" disabled={loading} className="settings-danger-btn" onClick={deleteAccount}>
            Delete account
          </button>
        </div>
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, description, children, danger }) {
  return (
    <section className={`settings-card ${danger ? 'danger' : ''}`}>
      <h3>{title}</h3>
      {description ? <p className="settings-card-desc">{description}</p> : null}
      {children}
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} />
    </label>
  )
}

export { SettingsCard }
