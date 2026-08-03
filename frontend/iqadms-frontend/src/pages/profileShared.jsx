export function SectionCard({ title, subtitle, children }) {
  return (
    <div className="profile-section-card">
      <div style={{ marginBottom: '1rem' }}>
        <h2 className="profile-section-title">{title}</h2>
        {subtitle && <p className="profile-section-sub">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function SidebarCard({ title, children }) {
  return (
    <div className="profile-sidebar-card">
      <h3 className="profile-sidebar-title">{title}</h3>
      {children}
    </div>
  )
}

export function InfoRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div className="profile-info-label">{label}</div>
      <div className="profile-info-value">{value}</div>
    </div>
  )
}

export const profileGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem'
}

/** @deprecated use profile-page.css classes */
export const profileStyles = {
  page: {},
  loadingCard: {},
  hero: {},
  heroOverlay: {},
  heroContent: {},
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  avatarBtn: {},
  heroText: {},
  heroTitle: {},
  heroSub: {},
  heroRole: {},
  badge: {},
  alert: {},
  grid: {},
  sidebar: {},
  sidebarCard: {},
  sidebarTitle: {},
  main: {},
  card: {},
  cardTitle: {},
  cardSub: {},
  infoLabel: {},
  infoValue: {},
  statNumber: {},
  statLabel: {},
  emptyText: {},
  historyCard: {},
  historyTitle: {},
  historyMeta: {},
  historyLink: {},
  hintBox: {},
  hintList: {},
  backLink: {}
}
