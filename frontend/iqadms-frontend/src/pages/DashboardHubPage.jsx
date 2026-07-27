import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import AppIcon from '../components/AppIcon'
import api from '../services/api'

const TILES = [
  {
    to: '/my-tasks',
    icon: 'tasks',
    title: 'My Tasks',
    desc: 'PQAD assignments, status, and deliverables'
  },
  {
    to: '/announcements',
    icon: 'announcements',
    title: 'Announcements',
    desc: 'Orientation, meetings, and PACUCOA visits'
  },
  {
    to: '/upcoming-deadlines',
    icon: 'deadlines',
    title: 'Upcoming Deadlines',
    desc: 'Due dates across projects and accreditation work'
  },
  {
    to: '/recent-activities',
    icon: 'activities',
    title: 'Recent Activities',
    desc: 'Latest updates from tasks and projects'
  },
  {
    to: '/notifications',
    icon: 'notifications',
    title: 'Notifications',
    desc: 'Assignments, reminders, and account alerts'
  },
  {
    to: '/statistics',
    icon: 'statistics',
    title: 'Statistics',
    desc: 'Completion rates, workload, and progress'
  },
  {
    to: '/calendar',
    icon: 'calendar',
    title: 'Calendar',
    desc: 'Meetings, visits, and accreditation schedules'
  },
  {
    to: '/projects',
    icon: 'projects',
    title: 'Projects',
    desc: 'PACUCOA 2026 and other PQAD initiatives'
  },
  {
    to: '/monitoring',
    icon: 'monitoring',
    title: 'Monitoring',
    desc: 'Filter by project, department, task, and staff'
  },
  {
    to: '/documents',
    icon: 'documents',
    title: 'Documents',
    desc: 'Uploaded files and submission tracking'
  },
  {
    to: '/reports',
    icon: 'reports',
    title: 'Reports',
    desc: 'Export PDF and Excel summaries'
  }
]

export default function DashboardHubPage() {
  const [upcoming, setUpcoming] = useState([])

  useEffect(() => {
    api.get('/Announcements', { params: { upcomingOnly: true } })
      .then(res => setUpcoming(res.data.slice(0, 4)))
      .catch(() => setUpcoming([]))
  }, [])

  return (
    <DashboardLayout>
      <div className="dashboard-hub">
        <header className="dashboard-hub-header">
          <h1>PQAD Dashboard</h1>
          <p className="dashboard-hub-campus">
            University of Perpetual Help System DALTA, Molino Campus
          </p>
          <p>
            Planning and Quality Assurance Department workspace. Tasks are assigned to
            PQAD staff; departments are tracked as related offices, not assignees.
          </p>
        </header>

        {upcoming.length > 0 && (
          <section
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,.06)',
              borderLeft: '4px solid #7a0019'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#7a0019' }}>Upcoming PQAD events</h2>
              <Link to="/announcements" style={{ color: '#7a0019', fontWeight: 600, fontSize: '0.9rem' }}>
                View all
              </Link>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#334155' }}>
              {upcoming.map(a => (
                <li key={a.id} style={{ marginBottom: '0.35rem' }}>
                  <strong>{a.title}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    {' '}
                    · {a.category} · {a.startDate}
                    {a.endDate && a.endDate !== a.startDate ? ` to ${a.endDate}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="dashboard-grid">
          {TILES.map(tile => (
            <Link key={tile.to} to={tile.to} className="dashboard-tile">
              <div className="dashboard-tile-icon">
                <AppIcon name={tile.icon} size={26} strokeWidth={1.65} />
              </div>
              <div className="dashboard-tile-title">{tile.title}</div>
              <div className="dashboard-tile-desc">{tile.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
