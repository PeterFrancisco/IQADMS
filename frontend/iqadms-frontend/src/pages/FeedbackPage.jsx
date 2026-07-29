import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'import { appDialog } from '../utils/appDialog'


export default function FeedbackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isBug = location.pathname.includes('bug')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!message.trim() || saving) return

    try {
      setSaving(true)
      await api.post('/Feedback', {
        type: isBug ? 'bug' : 'feedback',
        message: message.trim()
      })
      setMessage('')
      await appDialog.alert('Thank you. PQAD admins can review reports in the system.')
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to send report.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>{isBug ? 'Report a Bug' : 'Give Feedback'}</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        {isBug
          ? 'Describe what went wrong, including steps to reproduce if you can.'
          : 'Share ideas to improve IQADMS for the PQAD team.'}
      </p>

      <form onSubmit={submit} style={card}>
        <label style={label}>Message</label>
        <textarea
          style={{ ...input, minHeight: 140 }}
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          placeholder={isBug ? 'What happened? What did you expect?' : 'Your feedback…'}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? 'Sending…' : 'Submit'}
          </button>
          <button type="button" style={ghostBtn} onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)', maxWidth: 560 }
const label = { display: 'block', marginBottom: 6, fontWeight: 600, color: '#475569' }
const input = { width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: upshd.maroon, color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
