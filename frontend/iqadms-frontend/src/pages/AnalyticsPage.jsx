import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { downloadCsv, formatBytes } from '../utils/csvExport'
import { appDialog } from '../utils/appDialog'
import '../theme/analytics-page.css'

function monthInputValue(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function parseMonthInput(value) {
  const [y, m] = value.split('-').map(Number)
  return { year: y, month: m }
}

function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return String(iso)
  }
}

function mergeDailySeries(tasksByDay, docsByDay) {
  const map = new Map()
  for (const p of tasksByDay || []) {
    map.set(p.date, { date: p.date, tasks: p.count, docs: 0 })
  }
  for (const p of docsByDay || []) {
    const cur = map.get(p.date) || { date: p.date, tasks: 0, docs: 0 }
    cur.docs = p.count
    map.set(p.date, cur)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export default function AnalyticsPage() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (y, m) => {
    try {
      setLoading(true)
      const res = await api.get('/Analytics/monthly', { params: { year: y, month: m } })
      setData(res.data)
    } catch (err) {
      console.error(err)
      setData(null)
      await appDialog.alert(err.response?.data?.message || 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(year, month)
  }, [year, month, load])

  const chartDays = useMemo(
    () => mergeDailySeries(data?.tasksCompletedByDay, data?.documentsUploadedByDay),
    [data]
  )

  const chartMax = useMemo(() => {
    let max = 1
    for (const d of chartDays) {
      max = Math.max(max, d.tasks, d.docs)
    }
    return max
  }, [chartDays])

  function onMonthChange(e) {
    const { year: y, month: m } = parseMonthInput(e.target.value)
    setYear(y)
    setMonth(m)
  }

  function exportMonthlyCsv() {
    if (!data) return
    const slug = `${data.year}-${String(data.month).padStart(2, '0')}`
    const period = data.periodLabel || slug

    const summaryRows = [
      { metric: 'Period', value: period },
      { metric: 'Tasks completed', value: data.kpis?.tasksCompleted ?? 0 },
      { metric: 'Tasks submitted', value: data.kpis?.tasksSubmitted ?? 0 },
      { metric: 'Documents uploaded', value: data.kpis?.documentsUploaded ?? 0 },
      { metric: 'Open tasks (now)', value: data.kpis?.openTasksNow ?? 0 }
    ]

    downloadCsv(`iqadms-analytics-summary-${slug}.csv`, summaryRows, [
      { label: 'Metric', get: r => r.metric },
      { label: 'Value', get: r => r.value }
    ])

    const tasks = data.tasksCompletedInPeriod || []
    if (tasks.length) {
      downloadCsv(`iqadms-tasks-completed-${slug}.csv`, tasks, [
        { label: 'Title', get: r => r.title },
        { label: 'Assignee', get: r => r.assigneeName },
        { label: 'Project', get: r => r.projectTitle },
        { label: 'Completed at (UTC)', get: r => r.completedAt }
      ])
    }

    if (isAdmin && (data.documentsUploadedInPeriod?.length || 0) > 0) {
      downloadCsv(`iqadms-documents-uploaded-${slug}.csv`, data.documentsUploadedInPeriod, [
        { label: 'File name', get: r => r.fileName },
        { label: 'Folder', get: r => r.folderPath },
        { label: 'Uploaded by', get: r => r.uploadedByName },
        { label: 'Uploaded at (UTC)', get: r => r.uploadedAt }
      ])
    }

    const activity = data.recentActivity || []
    if (activity.length) {
      downloadCsv(`iqadms-activity-${slug}.csv`, activity, [
        { label: 'Category', get: r => r.category },
        { label: 'Title', get: r => r.title },
        { label: 'Detail', get: r => r.detail },
        { label: 'Actor', get: r => r.actorName },
        { label: 'Project', get: r => r.projectTitle },
        { label: 'Occurred at (UTC)', get: r => r.occurredAt }
      ])
    }

    if (!tasks.length && !activity.length && !(isAdmin && data.documentsUploadedInPeriod?.length)) {
      void appDialog.alert('No detail rows to export for this period.')
    }
  }

  const kpis = data?.kpis
  const taskMon = data?.taskMonitoring
  const docMon = data?.documentMonitoring

  return (
    <DashboardLayout>
      <div className="analytics-page">
        <header className="analytics-page__header">
          <div>
            <h1 className="analytics-page__title">Analytics</h1>
            <p className="analytics-page__sub">
              Monthly reports and live monitoring for tasks and documents — system-wide view for PQAD administrators.
            </p>
          </div>
          <button
            type="button"
            className="analytics-btn"
            onClick={exportMonthlyCsv}
            disabled={loading || !data}
          >
            Export CSV
          </button>
        </header>

        <div className="analytics-toolbar">
          <label>
            Report month
            <input
              type="month"
              value={monthInputValue(year, month)}
              onChange={onMonthChange}
              max={monthInputValue(now.getUTCFullYear(), now.getUTCMonth() + 1)}
            />
          </label>
          {data?.periodLabel && (
            <span style={{ color: '#64748b', fontSize: '0.9rem', marginLeft: 'auto' }}>
              {loading ? 'Refreshing…' : data.periodLabel}
            </span>
          )}
        </div>

        {loading && !data ? (
          <p className="analytics-empty">Loading analytics…</p>
        ) : !data ? (
          <p className="analytics-empty">No data for this period.</p>
        ) : (
          <>
            <div className="analytics-kpi-grid">
              <KpiCard label="Completed this month" value={kpis?.tasksCompleted} accent="#7a0019" />
              <KpiCard label="Submitted this month" value={kpis?.tasksSubmitted} accent="#9e1b32" />
              {isAdmin && (
                <KpiCard label="Documents uploaded" value={kpis?.documentsUploaded} accent="#2563eb" />
              )}
              <KpiCard label="Activity events" value={kpis?.activityEvents} accent="#64748b" />
              <KpiCard label="Open tasks now" value={kpis?.openTasksNow} accent="#0f172a" />
              <KpiCard label="In progress" value={kpis?.tasksInProgressNow} accent="#ea580c" />
              <KpiCard label="Awaiting review" value={kpis?.tasksAwaitingReviewNow} accent="#ca8a04" />
            </div>

            <div className="analytics-panel-grid">
              <section className="analytics-panel">
                <h2>Task monitoring</h2>
                <MetricRow label="Open (not completed)" value={taskMon?.totalOpen} />
                <MetricRow label="In progress" value={taskMon?.inProgress} />
                <MetricRow label="Submitted for review" value={taskMon?.submitted} />
                <MetricRow label="Returned" value={taskMon?.returned} />
                <MetricRow label="Overdue (open)" value={taskMon?.overdueOpen} highlight={taskMon?.overdueOpen > 0} />
                <MetricRow label="Completed (all time)" value={taskMon?.completedAllTime} />
              </section>

              {isAdmin && docMon && (
                <section className="analytics-panel">
                  <h2>Document monitoring</h2>
                  <MetricRow label="Library files" value={docMon.totalLibraryFiles} />
                  <MetricRow label="Uploaded this month" value={docMon.uploadedThisPeriod} />
                  <MetricRow label="In trash" value={docMon.trashedFiles} />
                  <MetricRow label="Storage used" value={formatBytes(docMon.storageBytesUsed)} />
                </section>
              )}
            </div>

            {chartDays.length > 0 && (
              <section className="analytics-panel analytics-chart">
                <h2>Daily activity</h2>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <span>
                    <span className="analytics-chart__bar analytics-chart__bar--tasks" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, verticalAlign: 'middle' }} />{' '}
                    Tasks completed
                  </span>
                  {isAdmin && (
                    <span>
                      <span className="analytics-chart__bar analytics-chart__bar--docs" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, verticalAlign: 'middle' }} />{' '}
                      Documents uploaded
                    </span>
                  )}
                </div>
                <div className="analytics-chart__bars">
                  {chartDays.map(d => {
                    const dayNum = d.date.slice(8)
                    return (
                      <div key={d.date} className="analytics-chart__bar-wrap" title={`${d.date}: ${d.tasks} tasks, ${d.docs} docs`}>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120 }}>
                          <div
                            className="analytics-chart__bar analytics-chart__bar--tasks"
                            style={{ height: `${Math.max(4, (d.tasks / chartMax) * 100)}%`, flex: 1 }}
                          />
                          {isAdmin && (
                            <div
                              className="analytics-chart__bar analytics-chart__bar--docs"
                              style={{ height: `${Math.max(4, (d.docs / chartMax) * 100)}%`, flex: 1 }}
                            />
                          )}
                        </div>
                        <span className="analytics-chart__day">{dayNum}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="analytics-section">
              <div className="analytics-section__head">
                <h2>Tasks completed in {data.periodLabel}</h2>
                <button
                  type="button"
                  className="analytics-btn analytics-btn--ghost"
                  onClick={() => {
                    const tasks = data.tasksCompletedInPeriod || []
                    if (!tasks.length) {
                      void appDialog.alert('No completed tasks in this period.')
                      return
                    }
                    downloadCsv(
                      `iqadms-tasks-completed-${data.year}-${String(data.month).padStart(2, '0')}.csv`,
                      tasks,
                      [
                        { label: 'Title', get: r => r.title },
                        { label: 'Assignee', get: r => r.assigneeName },
                        { label: 'Project', get: r => r.projectTitle },
                        { label: 'Completed at', get: r => r.completedAt }
                      ]
                    )
                  }}
                >
                  Export table
                </button>
              </div>
              <div className="analytics-table-wrap">
                {(data.tasksCompletedInPeriod?.length ?? 0) === 0 ? (
                  <p className="analytics-empty">No tasks were marked completed in this month.</p>
                ) : (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Assignee</th>
                        <th>Project</th>
                        <th>Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tasksCompletedInPeriod.map(row => (
                        <tr key={row.id}>
                          <td>{row.title}</td>
                          <td>{row.assigneeName || '—'}</td>
                          <td>{row.projectTitle || '—'}</td>
                          <td>{formatDateTime(row.completedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {isAdmin && (
              <section className="analytics-section">
                <div className="analytics-section__head">
                  <h2>Documents uploaded in {data.periodLabel}</h2>
                </div>
                <div className="analytics-table-wrap">
                  {(data.documentsUploadedInPeriod?.length ?? 0) === 0 ? (
                    <p className="analytics-empty">No library uploads recorded this month.</p>
                  ) : (
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>File</th>
                          <th>Folder</th>
                          <th>Uploaded by</th>
                          <th>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.documentsUploadedInPeriod.map(row => (
                          <tr key={row.id}>
                            <td>{row.fileName}</td>
                            <td>{row.folderPath || '—'}</td>
                            <td>{row.uploadedByName || '—'}</td>
                            <td>{formatDateTime(row.uploadedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            <section className="analytics-section">
              <div className="analytics-section__head">
                <h2>Recent activity</h2>
              </div>
              {(data.recentActivity?.length ?? 0) === 0 ? (
                <p className="analytics-empty">No task or document activity in this period.</p>
              ) : (
                <ul className="analytics-activity">
                  {data.recentActivity.map(item => (
                    <li key={`${item.category}-${item.id}`}>
                      <span
                        className={`analytics-activity__icon analytics-activity__icon--${item.category === 'document' ? 'document' : 'task'}`}
                      >
                        {item.category === 'document' ? 'doc' : 'task'}
                      </span>
                      <div className="analytics-activity__body">
                        <div className="analytics-activity__title">{item.title}</div>
                        {item.detail && <div className="analytics-activity__meta">{item.detail}</div>}
                        <div className="analytics-activity__meta">
                          {[item.actorName, item.projectTitle, formatDateTime(item.occurredAt)]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function KpiCard({ label, value, accent }) {
  return (
    <div className="analytics-kpi" style={{ '--kpi-accent': accent }}>
      <div className="analytics-kpi__label">{label}</div>
      <div className="analytics-kpi__value">{value ?? '—'}</div>
    </div>
  )
}

function MetricRow({ label, value, highlight }) {
  return (
    <div className="analytics-metric-row">
      <span>{label}</span>
      <span style={highlight ? { color: '#dc2626' } : undefined}>{value ?? '—'}</span>
    </div>
  )
}
