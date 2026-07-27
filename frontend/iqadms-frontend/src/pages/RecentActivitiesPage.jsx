import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'

export default function RecentActivitiesPage() {
  const [activities, setActivities] = useState([])
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/Projects').then(r => setProjects(r.data)).catch(console.error)
  }, [])

  useEffect(() => {
    load()
  }, [projectId])

  async function load() {
    try {
      setLoading(true)
      const params = { limit: 50 }
      if (projectId) params.projectId = projectId
      const res = await api.get('/Dashboard/recent-activity', { params })
      setActivities(res.data)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to load activity.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>Recent Activities</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Task updates, comments, attachments, and status changes across PQAD.
      </p>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginRight: '0.5rem' }}>
          Project
        </label>
        <select value={projectId} onChange={e => setProjectId(e.target.value)} style={selectStyle}>
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : activities.length === 0 ? (
        <div style={card}>No activity yet. Updates appear when tasks are created or edited.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
          {activities.map(a => (
            <li key={a.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <Link to={`/my-tasks?task=${a.taskId}`} style={{ color: upshd.maroon, fontWeight: 700, textDecoration: 'none' }}>
                    {a.taskTitle}
                  </Link>
                  {a.projectTitle && (
                    <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: 8 }}>· {a.projectTitle}</span>
                  )}
                </div>
                <time style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  {new Date(a.createdAt).toLocaleString()}
                </time>
              </div>
              <p style={{ margin: '0.5rem 0 0', color: '#334155' }}>
                <strong style={{ textTransform: 'capitalize' }}>{a.action}</strong>
                {a.detail ? `: ${a.detail}` : ''}
                {a.actorName && (
                  <span style={{ color: '#64748b' }}> · {a.actorName}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: '1rem 1.15rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const selectStyle = { padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 220 }
