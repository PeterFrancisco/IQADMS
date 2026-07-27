import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const TILES = [
  {
    to: '/my-tasks',
    icon: '✅',
    title: 'My Tasks',
    desc: 'PQAD assignments, status, and deliverables'
  },
  {
    to: '/upcoming-deadlines',
    icon: '⏰',
    title: 'Upcoming Deadlines',
    desc: 'Due dates across projects and accreditation work'
  },
  {
    to: '/recent-activities',
    icon: '📋',
    title: 'Recent Activities',
    desc: 'Latest updates from tasks and projects'
  },
  {
    to: '/notifications',
    icon: '🔔',
    title: 'Notifications',
    desc: 'Assignments, reminders, and account alerts'
  },
  {
    to: '/statistics',
    icon: '📈',
    title: 'Statistics',
    desc: 'Completion rates, workload, and progress'
  },
  {
    to: '/calendar',
    icon: '📅',
    title: 'Calendar',
    desc: 'Meetings, visits, and accreditation schedules'
  },
  {
    to: '/projects',
    icon: '📁',
    title: 'Projects',
    desc: 'PACUCOA 2026 and other PQAD initiatives'
  },
  {
    to: '/monitoring',
    icon: '📊',
    title: 'Monitoring',
    desc: 'Filter by project, department, task, and staff'
  },
  {
    to: '/documents',
    icon: '📄',
    title: 'Documents',
    desc: 'Uploaded files and submission tracking'
  },
  {
    to: '/reports',
    icon: '📑',
    title: 'Reports',
    desc: 'Export PDF and Excel summaries'
  }
]

export default function DashboardHubPage() {
  return (
    <DashboardLayout>
      <div className="dashboard-hub">
        <header className="dashboard-hub-header">
          <h1>PQAD Dashboard</h1>
          <p className="dashboard-hub-campus">
            University of Perpetual Help System DALTA — Molino Campus
          </p>
          <p>
            Planning and Quality Assurance Department workspace. Tasks are assigned to
            PQAD staff; departments are tracked as related offices, not assignees.
          </p>
        </header>

        <div className="dashboard-grid">
          {TILES.map(tile => (
            <Link key={tile.to} to={tile.to} className="dashboard-tile">
              <div className="dashboard-tile-icon">{tile.icon}</div>
              <div className="dashboard-tile-title">{tile.title}</div>
              <div className="dashboard-tile-desc">{tile.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
