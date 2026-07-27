import { useNavigate } from 'react-router-dom'
import { authPageStyle, authCardStyle, authPrimaryButtonStyle } from '../theme/pageStyles'

export default function RequestSubmittedPage() {
  const navigate = useNavigate()

  return (
    <div style={authPageStyle}>
      <div
        style={{
          ...authCardStyle,
          maxWidth: '520px',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '2rem'
          }}
        >
          ✓
        </div>

        <h1 style={{ color: '#166534', marginBottom: '0.5rem' }}>
          Request Submitted
        </h1>

        <p style={{ color: '#475569', lineHeight: 1.7 }}>
          The administrator has been informed of your request.
          Please wait for approval before creating an IQADMS account.
        </p>

        <p style={{ color: '#64748b' }}>
          You may contact the PQAD administrator for follow-up.
        </p>

        <button
          onClick={() => navigate('/login')}
          style={{
            ...authPrimaryButtonStyle,
            marginTop: '1.5rem'
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}