import { upshd } from '../theme/upshd'

export function SectionCard({ title, subtitle, children }) {
  return (
    <div style={profileStyles.card}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={profileStyles.cardTitle}>{title}</h2>
        {subtitle && <p style={profileStyles.cardSub}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function SidebarCard({ title, children }) {
  return (
    <div style={profileStyles.sidebarCard}>
      <h3 style={profileStyles.sidebarTitle}>{title}</h3>
      {children}
    </div>
  )
}

export function InfoRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={profileStyles.infoLabel}>{label}</div>
      <div style={profileStyles.infoValue}>{value}</div>
    </div>
  )
}

export const profileGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem'
}

export const profileStyles = {
  page: {
    maxWidth: 1100,
    margin: '0 auto'
  },
  loadingCard: {
    background: 'var(--upshd-surface, #fff)',
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
    background: 'var(--upshd-surface, #fff)',
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
    background: 'var(--upshd-surface, #fff)',
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
  statNumber: {
    fontSize: '2rem',
    fontWeight: 700,
    color: upshd.maroon
  },
  statLabel: {
    color: '#64748b',
    fontSize: '0.85rem'
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
  backLink: {
    border: 'none',
    background: 'none',
    color: upshd.maroon,
    cursor: 'pointer',
    marginBottom: '1rem',
    fontWeight: 600,
    padding: 0,
    fontSize: '0.95rem'
  }
}
