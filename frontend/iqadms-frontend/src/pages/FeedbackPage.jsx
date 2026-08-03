import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import {
  ghostButtonStyle,
  inlineCardStyle,
  labelStyle,
  pageSubtitleStyle,
  pageTitleStyle,
  primaryButtonStyle,
  fieldInputStyle
} from '../theme/pageStyles'
import { appDialog } from '../utils/appDialog'


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
      await appDialog.alert('Thank you. PQAD will receive your report by email at iqadms.pqad@gmail.com.')
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
      <p style={pageSubtitleStyle}>
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

const card = { ...inlineCardStyle, padding: '1.25rem', maxWidth: 560 }
const label = labelStyle
const input = { ...fieldInputStyle, padding: '0.65rem' }
const primaryBtn = { ...primaryButtonStyle, padding: '0.6rem 1rem', borderRadius: 8 }
const ghostBtn = { ...ghostButtonStyle, padding: '0.6rem 1rem', borderRadius: 8 }
