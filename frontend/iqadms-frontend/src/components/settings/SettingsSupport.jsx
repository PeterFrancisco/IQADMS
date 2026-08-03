import { useState } from 'react'
import api from '../../services/api'
import { appDialog } from '../../utils/appDialog'

export default function SettingsSupport() {
  const [bugMessage, setBugMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(type, message, clear) {
    if (!message.trim() || saving) return
    setSaving(true)
    try {
      await api.post('/Feedback', { type, message: message.trim() })
      clear('')
      await appDialog.alert('Thank you. PQAD admins can review your report in Settings.')
    } catch (err) {
      await appDialog.alert({ message: err.response?.data?.message || 'Failed to send.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-stack">
      <section className="settings-card">
        <h3>Report a bug</h3>
        <p className="settings-card-desc">Describe what went wrong, including steps to reproduce if you can.</p>
        <textarea
          className="settings-textarea"
          value={bugMessage}
          onChange={e => setBugMessage(e.target.value)}
          placeholder="What happened? What did you expect?"
          rows={5}
        />
        <button
          type="button"
          className="settings-primary-btn"
          disabled={saving || !bugMessage.trim()}
          onClick={() => submit('bug', bugMessage, setBugMessage)}
        >
          Submit bug report
        </button>
      </section>

      <section className="settings-card">
        <h3>Submit feedback</h3>
        <p className="settings-card-desc">Share ideas to improve IQADMS for the PQAD team.</p>
        <textarea
          className="settings-textarea"
          value={feedbackMessage}
          onChange={e => setFeedbackMessage(e.target.value)}
          placeholder="Your feedback…"
          rows={5}
        />
        <button
          type="button"
          className="settings-primary-btn"
          disabled={saving || !feedbackMessage.trim()}
          onClick={() => submit('feedback', feedbackMessage, setFeedbackMessage)}
        >
          Submit feedback
        </button>
      </section>
    </div>
  )
}
