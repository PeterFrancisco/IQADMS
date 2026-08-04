import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { appDialog } from '../utils/appDialog'
import IqadmsLogo from '../components/IqadmsLogo'
import './login-page.css'

export default function RequestAccountPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    department: '',
    position: '',
    reason: ''
  })

  const handleChange = e => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()

    try {
      await api.post('/Auth/request-access', form)
      navigate('/request-submitted')
    } catch (err) {
      console.error(err)
      await appDialog.alert(
        err.response?.data?.message ||
          err.response?.data ||
          err.message ||
          'Failed to submit request.'
      )
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-card" style={{ maxWidth: 560 }}>
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <IqadmsLogo size={48} className="iqadms-logo--center" />
          </div>
          <h1 style={{ margin: 0, color: 'var(--upshd-page-heading, var(--upshd-maroon))' }}>Request access</h1>
          <p className="auth-text" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Submit your details for PQAD review. You can register after an administrator approves your email.
          </p>
        </div>

        <div className="login-notice login-notice--info">
          <strong>Important — safe senders</strong>
          <p>
            Approval and invitation emails come from <strong>iqadms.pqad@gmail.com</strong>. Add this address to your safe senders, contacts, or allowed list in Gmail/Outlook so messages are not blocked or sent to spam.
          </p>
        </div>

        <div className="login-field">
          <label>
            Full name
            <input name="fullName" className="login-input" value={form.fullName} onChange={handleChange} required />
          </label>
        </div>

        <div className="login-field">
          <label>
            Institutional email
            <input type="email" name="email" className="login-input" value={form.email} onChange={handleChange} required />
          </label>
        </div>

        <div className="login-field">
          <label>
            Department / office
            <input name="department" className="login-input" value={form.department} onChange={handleChange} required />
          </label>
        </div>

        <div className="login-field">
          <label>
            Position
            <input name="position" className="login-input" value={form.position} onChange={handleChange} required />
          </label>
        </div>

        <div className="login-field">
          <label>
            Reason for access
            <textarea
              name="reason"
              className="login-input"
              value={form.reason}
              onChange={handleChange}
              required
              rows={4}
              style={{ minHeight: 96, resize: 'vertical' }}
            />
          </label>
        </div>

        <button type="submit" className="login-submit">
          Submit request
        </button>

        <p className="auth-text auth-text-center" style={{ marginTop: '1rem', marginBottom: 0 }}>
          Already approved? <Link to="/register" className="auth-link">Register</Link>
          {' · '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
