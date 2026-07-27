import { upshd } from './upshd'

/** Shared layout for login, register, and request-access pages */
export const authPageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--upshd-bg, #f7f4f5)',
  padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
  fontFamily: 'Arial, sans-serif'
}

export const authCardStyle = {
  width: '100%',
  maxWidth: '460px',
  background: 'white',
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 8px 24px rgba(92, 0, 18, 0.1)'
}

export const authHeadingStyle = {
  marginTop: 0,
  color: upshd.maroon
}

export const authPrimaryButtonStyle = {
  width: '100%',
  marginTop: '1rem',
  padding: '0.9rem',
  border: 'none',
  borderRadius: '10px',
  background: upshd.maroon,
  color: 'white',
  fontWeight: '700',
  cursor: 'pointer'
}

export const authOutlineButtonStyle = {
  width: '100%',
  marginTop: '0.75rem',
  padding: '0.9rem',
  border: `1px solid ${upshd.maroon}`,
  borderRadius: '10px',
  background: 'white',
  color: upshd.maroon,
  fontWeight: '700',
  cursor: 'pointer'
}

export const authInputStyle = {
  width: '100%',
  padding: '0.9rem',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  marginTop: '0.5rem',
  boxSizing: 'border-box'
}

export const pageTitleStyle = {
  margin: '0 0 0.25rem',
  color: upshd.maroon
}

export const sectionTitleStyle = {
  marginTop: 0,
  color: upshd.maroon
}

export const tableHeadRowStyle = {
  background: upshd.tableHeadBg
}

export const primaryButtonStyle = {
  padding: '0.85rem 1.2rem',
  border: 'none',
  borderRadius: '10px',
  background: upshd.maroon,
  color: 'white',
  fontWeight: '600',
  cursor: 'pointer'
}

export const linkStyle = {
  color: upshd.maroonLight,
  textDecoration: 'none'
}
