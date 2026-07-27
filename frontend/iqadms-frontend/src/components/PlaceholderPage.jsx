import DashboardLayout from '../components/DashboardLayout'

export default function PlaceholderPage({ title, subtitle, planned = [] }) {
  return (
    <DashboardLayout>
      <div className="placeholder-page">
        <span className="placeholder-badge">Coming soon</span>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {planned.length > 0 && (
          <div className="placeholder-card">
            <strong>Planned for this module</strong>
            <ul>
              {planned.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
