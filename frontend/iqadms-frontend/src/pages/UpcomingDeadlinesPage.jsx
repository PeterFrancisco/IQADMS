import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'

const TYPE_LABELS = { task: 'Task', project: 'Project', accreditation: 'Accreditation' }

function dueLabel(item) {
  if (item.isOverdue) {
    const days = Math.abs(item.daysUntilDue)
    return days === 0 ? 'Due today (overdue)' : `${days} day${days === 1 ? '' : 's'} overdue`
  }
  if (item.daysUntilDue === 0) return 'Due today'
  if (item.daysUntilDue === 1) return 'Due tomorrow'
  return `In ${item.daysUntilDue} days`
}

function itemLink(item) {
  if (item.itemType === 'task') return '/my-tasks'
  if (item.itemType === 'project') return '/projects'
  return '/activities'
}

export default function UpcomingDeadlinesPage() {
  const [items, setItems] = useState([])
  const [range, setRange] = useState('month')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [range, overdueOnly])

  async function load() {
    try {
      setLoading(true)
      const res = await api.get('/Dashboard/deadlines', {
        params: { range, overdueOnly }
      })
      setItems(res.data)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to load deadlines.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>Upcoming Deadlines</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Tasks, projects, and accreditation milestones with due dates.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <select value={range} onChange={e => setRange(e.target.value)} style={selectStyle}>
          <option value="week">Next 7 days + overdue</option>
          <option value="month">Next 30 days + overdue</option>
          <option value="all">All open deadlines</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
          <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
          Overdue only
        </label>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div style={card}>No deadlines in this view. Add due dates on tasks or projects.</div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: upshd.tableHeadBg }}>
                <th style={th}>Due</th>
                <th style={th}>Title</th>
                <th style={th}>Type</th>
                <th style={th}>Context</th>
                <th style={th}>When</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={`${item.itemType}-${item.id}`}>
                  <td style={td}>
                    <span style={{ fontWeight: 600 }}>{item.dueDate}</span>
                  </td>
                  <td style={td}>
                    <Link to={itemLink(item)} style={{ color: upshd.maroon, fontWeight: 600, textDecoration: 'none' }}>
                      {item.title}
                    </Link>
                    {item.status && (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>{item.status}</div>
                    )}
                  </td>
                  <td style={td}>{TYPE_LABELS[item.itemType] || item.itemType}</td>
                  <td style={td}>
                    {item.projectTitle && item.itemType === 'task' && (
                      <span>{item.projectTitle}</span>
                    )}
                    {item.assignedToName && (
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.assignedToName}</div>
                    )}
                    {!item.projectTitle && !item.assignedToName && item.itemType !== 'project' && '—'}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 999,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: item.isOverdue ? '#fee2e2' : '#ecfdf5',
                        color: item.isOverdue ? '#b91c1c' : '#047857'
                      }}
                    >
                      {dueLabel(item)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const th = { textAlign: 'left', padding: '0.85rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }
const td = { padding: '0.85rem 1rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
const selectStyle = { padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1' }
