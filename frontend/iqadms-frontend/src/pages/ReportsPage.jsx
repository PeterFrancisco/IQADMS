import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'

const STATUS_OPTIONS = ['', 'To Do', 'In Progress', 'Waiting', 'Completed', 'Cancelled', 'Planning', 'Done', 'Review']

function escapeCsv(value) {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename, rows, headers) {
  const lines = [
    headers.map(h => escapeCsv(h.label)).join(','),
    ...rows.map(row => headers.map(h => escapeCsv(h.get(row))).join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [projects, setProjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [filters, setFilters] = useState({
    projectId: '',
    relatedDepartmentId: '',
    status: '',
    dueFrom: '',
    dueTo: '',
    includeCompleted: true
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/Projects'), api.get('/Departments')])
      .then(([p, d]) => {
        setProjects(p.data)
        setDepartments(d.data)
      })
      .catch(console.error)
  }, [])

  async function runReport() {
    try {
      setLoading(true)
      const params = { includeCompleted: filters.includeCompleted }
      if (filters.projectId) params.projectId = filters.projectId
      if (filters.relatedDepartmentId) params.relatedDepartmentId = filters.relatedDepartmentId
      if (filters.status) params.status = filters.status
      if (filters.dueFrom) params.dueFrom = filters.dueFrom
      if (filters.dueTo) params.dueTo = filters.dueTo

      const res = await api.get('/Reports/tasks', { params })
      setReport(res.data)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to generate report.')
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (!report?.rows?.length) {
      alert('No rows to export. Run the report first.')
      return
    }

    const headers = [
      { label: 'Title', get: r => r.title },
      { label: 'Status', get: r => r.status },
      { label: 'Priority', get: r => r.priority },
      { label: 'Due date', get: r => r.dueDate || '' },
      { label: 'Assignee', get: r => r.assigneeName || '' },
      { label: 'Project', get: r => r.projectTitle || '' },
      { label: 'Related department', get: r => r.relatedDepartmentName || '' },
      { label: 'Completed at', get: r => r.completedAt || '' },
      { label: 'Created at', get: r => r.createdAt }
    ]

    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`iqadms-task-report-${stamp}.csv`, report.rows, headers)
  }

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>Reports</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Filter PQAD tasks and export a CSV summary for meetings and accreditation tracking.
      </p>

      <div style={card}>
        <h2 style={sectionTitle}>Task report</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <Field label="Project">
            <select style={input} value={filters.projectId} onChange={e => setFilters({ ...filters, projectId: e.target.value })}>
              <option value="">All</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Related department">
            <select style={input} value={filters.relatedDepartmentId} onChange={e => setFilters({ ...filters, relatedDepartmentId: e.target.value })}>
              <option value="">All</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select style={input} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              {STATUS_OPTIONS.map(s => (
                <option key={s || 'all'} value={s}>{s || 'All'}</option>
              ))}
            </select>
          </Field>
          <Field label="Due from">
            <input type="date" style={input} value={filters.dueFrom} onChange={e => setFilters({ ...filters, dueFrom: e.target.value })} />
          </Field>
          <Field label="Due to">
            <input type="date" style={input} value={filters.dueTo} onChange={e => setFilters({ ...filters, dueTo: e.target.value })} />
          </Field>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            checked={filters.includeCompleted}
            onChange={e => setFilters({ ...filters, includeCompleted: e.target.checked })}
          />
          Include completed and cancelled tasks
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" onClick={runReport} disabled={loading} style={primaryBtn}>
            {loading ? 'Generating…' : 'Generate report'}
          </button>
          <button type="button" onClick={exportCsv} style={ghostBtn} disabled={!report?.rows?.length}>
            Download CSV
          </button>
        </div>
      </div>

      {report && (
        <div style={{ ...card, marginTop: '1.25rem', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.15rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <MiniStat label="Rows" value={report.totalRows} />
            <MiniStat label="Open" value={report.openCount} />
            <MiniStat label="Completed" value={report.completedCount} />
            <MiniStat label="Overdue" value={report.overdueCount} color="#dc2626" />
          </div>

          {report.rows.length === 0 ? (
            <p style={{ padding: '1.5rem', color: '#94a3b8', margin: 0 }}>No tasks match these filters.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: upshd.tableHeadBg }}>
                    {['Task', 'Status', 'Priority', 'Due', 'Assignee', 'Project', 'Dept'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map(row => (
                    <tr key={row.id}>
                      <td style={td}>{row.title}</td>
                      <td style={td}>{row.status}</td>
                      <td style={td}>{row.priority}</td>
                      <td style={td}>{row.dueDate || '—'}</td>
                      <td style={td}>{row.assigneeName || '—'}</td>
                      <td style={td}>{row.projectTitle || '—'}</td>
                      <td style={td}>{row.relatedDepartmentName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        PDF and Excel export can be added later; CSV opens in Excel and Google Sheets.
      </p>
    </DashboardLayout>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: color || upshd.maroon }}>{value}</div>
    </div>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: '1.15rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const sectionTitle = { margin: '0 0 1rem', fontSize: '1.05rem', color: upshd.maroon }
const input = { width: '100%', padding: '0.5rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: upshd.maroon, color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const th = { textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
