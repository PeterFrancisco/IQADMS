import { useNavigate } from 'react-router-dom'

export default function RequestSubmittedPage() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f5f7fb',
        padding: '2rem',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
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
            marginTop: '1.5rem',
            width: '100%',
            padding: '0.9rem',
            border: 'none',
            borderRadius: '10px',
            background: '#2563eb',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}