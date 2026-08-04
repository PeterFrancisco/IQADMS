import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import AppIcon from '../components/AppIcon'
import api from '../services/api'
import { formatDateRange } from '../utils/calendarEvents'

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
    desc: 'Latest updates from tasks and projects',
    adminOnly: true
  },
  {
    to: '/notifications',
    icon: 'notifications',
    title: 'Notifications',
    desc: 'Assignments, reminders, and account alerts'
  },
  {
    to: '/analytics',
    icon: 'analytics',
    title: 'Analytics',
    desc: 'Monthly reports, task & document monitoring, CSV export',
    adminOnly: true
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
    desc: 'PACUCOA 2026 and other PQAD initiatives',
    adminOnly: true
  },
  {
    to: '/documents',
    icon: 'documents',
    title: 'Documents',
    desc: 'Uploaded files and submission tracking',
    adminOnly: true
  },
]

export default function DashboardHubPage() {
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true'
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
          <section className="dashboard-hub-events">
            <div className="dashboard-hub-events-head">
              <h2>Upcoming PQAD events</h2>
              <Link to="/announcements">View all</Link>
            </div>
            <ul>
              {upcoming.map(a => (
                <li key={a.id}>
                  <Link to={`/announcements?id=${a.id}`} className="dashboard-hub-events-link">
                    <strong>{a.title}</strong>
                    <span className="dashboard-hub-events-meta">
                      {' '}
                      · {a.category} · {formatDateRange(a.startDate, a.endDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="dashboard-grid">
          {TILES.filter(tile => !tile.adminOnly || isAdmin).map(tile => (
            <Link key={tile.to} to={tile.to} className="dashboard-tile">
              <div className="dashboard-tile-icon">
                <AppIcon name={tile.icon} size={26} strokeWidth={1.65} />
              </div>
              <div className="dashboard-tile-title">
                {tile.to === '/my-tasks' && isAdmin ? 'Tasks' : tile.title}
              </div>
              <div className="dashboard-tile-desc">{tile.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
