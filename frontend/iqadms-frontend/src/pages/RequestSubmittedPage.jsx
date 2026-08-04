import { useNavigate } from 'react-router-dom'
import IqadmsLogo from '../components/IqadmsLogo'
import './login-page.css'

export default function RequestSubmittedPage() {
  const navigate = useNavigate()

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <IqadmsLogo size={48} className="iqadms-logo--center" />
        </div>
        <div className="auth-success-icon" aria-hidden>
          ✓
        </div>

        <div className="login-notice login-notice--success" style={{ textAlign: 'left' }}>
          <h1>Request submitted</h1>
          <p>
            The PQAD administrator has been notified. Please wait for approval before creating an IQADMS account.
          </p>
        </div>

        <div className="login-notice login-notice--info" style={{ textAlign: 'left' }}>
          <strong>Watch your inbox</strong>
          <p>
            When approved, you will receive email from <strong>iqadms.pqad@gmail.com</strong>. Add this address to your safe senders or contacts so the message is not blocked.
          </p>
        </div>

        <p className="auth-text">
          You may contact the PQAD administrator for follow-up.
        </p>

        <button type="button" onClick={() => navigate('/login')} className="login-submit">
          Back to sign in
        </button>
      </div>
    </div>
  )
}
