import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import {
  accentLinkStyle,
  mutedTextStyle,
  pageSubtitleStyle,
  pageTitleStyle,
  sectionHeadingStyle,
  surfaceCardStyle
} from '../theme/pageStyles'
import { appDialog } from '../utils/appDialog'


export default function StatisticsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/Dashboard/statistics')
      .then(res => setStats(res.data))
      .catch(err => {
        console.error(err)
        void appDialog.alert(err.response?.data?.message || 'Failed to load statistics.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <p>Loading statistics…</p>
      </DashboardLayout>
    )
  }

  if (!stats) return null

  const completionRate = stats.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>Statistics</h1>
      <p style={pageSubtitleStyle}>
        PQAD task workload and progress at a glance.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total tasks" value={stats.totalTasks} color="var(--upshd-maroon, #7a0019)" />
        <StatCard label="Open" value={stats.openTasks} color="#f59e0b" />
        <StatCard label="Completed" value={stats.completedTasks} color="#16a34a" />
        <StatCard label="Overdue" value={stats.overdueTasks} color="#dc2626" />
        <StatCard label="My open assigned" value={stats.myOpenAssigned} color="#9333ea" />
        <StatCard label="Active projects" value={stats.activeProjects} color="#0ea5e9" />
        <StatCard label="Completion rate" value={`${completionRate}%`} color="#16a34a" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.25rem' }}>
        <section style={card}>
          <h2 style={sectionTitle}>By status</h2>
          {stats.tasksByStatus.length === 0 ? (
            <p style={{ ...mutedTextStyle, margin: 0 }}>No tasks yet.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {stats.tasksByStatus.map(row => (
                <li key={row.status} style={rowStyle}>
                  <span>{row.status}</span>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={card}>
          <h2 style={sectionTitle}>By project</h2>
          {stats.byProject.length === 0 ? (
            <p style={{ ...mutedTextStyle, margin: 0 }}>No project-linked tasks.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={th}>Project</th>
                    <th style={th}>Open</th>
                    <th style={th}>Total</th>
                    <th style={th}>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byProject.map(row => (
                    <tr key={row.projectId ?? 'none'}>
                      <td style={td}>
                        {row.projectId ? (
                          <Link to="/projects" style={accentLinkStyle}>
                            {row.projectTitle}
                          </Link>
                        ) : (
                          row.projectTitle
                        )}
                      </td>
                      <td style={td}>{row.openTasks}</td>
                      <td style={td}>{row.totalTasks}</td>
                      <td style={td}>{row.overdueTasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
        <Link to="/upcoming-deadlines" style={accentLinkStyle}>View upcoming deadlines</Link>
        {' · '}
        <Link to="/my-tasks" style={accentLinkStyle}>Open My Tasks</Link>
      </p>
    </DashboardLayout>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...card, borderLeft: `4px solid ${color}` }}>
      <div style={{ ...mutedTextStyle, fontSize: '0.85rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

const card = { ...surfaceCardStyle, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const sectionTitle = sectionHeadingStyle
const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--upshd-border, #f1f5f9)' }
const th = { textAlign: 'left', padding: '0.5rem 0.25rem', color: 'var(--upshd-text-muted, #64748b)', fontWeight: 600, borderBottom: '1px solid var(--upshd-border, #e5e7eb)' }
const td = { padding: '0.5rem 0.25rem', borderBottom: '1px solid var(--upshd-border, #f1f5f9)' }
