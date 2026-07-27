import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'
import { pageTitleStyle } from '../theme/pageStyles'

const TYPE_COLORS = {
  task: '#7a0019',
  project: '#0ea5e9',
  accreditation: '#9333ea',
  announcement: '#c2410c'
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month - 1, d))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function eventLink(event) {
  if (event.itemType === 'task') return `/my-tasks?task=${event.id}`
  if (event.itemType === 'project') return '/projects'
  if (event.itemType === 'announcement') return '/announcements'
  return '/activities'
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    loadEvents()
  }, [year, month])

  async function loadEvents() {
    try {
      setLoading(true)
      const res = await api.get('/Dashboard/calendar-events', { params: { year, month } })
      setEvents(res.data)
      setSelectedDay(null)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to load calendar.')
    } finally {
      setLoading(false)
    }
  }

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const key = e.date
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [events])

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])

  function shiftMonth(delta) {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const selectedEvents = selectedDay ? eventsByDate[dateKey(selectedDay)] || [] : []

  return (
    <DashboardLayout>
      <h1 style={pageTitleStyle}>Calendar</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Task due dates, project milestones, and accreditation schedules.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" onClick={() => shiftMonth(-1)} style={navBtn} aria-label="Previous month">‹</button>
          <strong style={{ color: upshd.maroon, minWidth: 180, textAlign: 'center' }}>{monthLabel(year, month)}</strong>
          <button type="button" onClick={() => shiftMonth(1)} style={navBtn} aria-label="Next month">›</button>
        </div>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const t = new Date()
            setYear(t.getFullYear())
            setMonth(t.getMonth() + 1)
          }}
        >
          Today
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <Legend color={TYPE_COLORS.task} label="Task due" />
        <Legend color={TYPE_COLORS.project} label="Project start / due" />
        <Legend color={TYPE_COLORS.accreditation} label="Accreditation" />
        <Legend color={TYPE_COLORS.announcement} label="PQAD announcements" />
      </div>

      {loading ? (
        <p>Loading calendar…</p>
      ) : (
        <>
          <div style={gridWrap}>
            {WEEKDAYS.map(w => (
              <div key={w} style={weekdayHead}>{w}</div>
            ))}
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} style={emptyCell} />
              }
              const key = dateKey(day)
              const dayEvents = eventsByDate[key] || []
              const isToday = dateKey(day) === dateKey(now)
              const isSelected = selectedDay && dateKey(selectedDay) === key

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    ...dayCell,
                    borderColor: isSelected ? upshd.maroon : isToday ? '#fbbf24' : '#e2e8f0',
                    background: isSelected ? '#fff5f7' : '#fff'
                  }}
                >
                  <div style={{ fontWeight: 700, color: isToday ? upshd.maroon : '#334155', marginBottom: 4 }}>
                    {day.getDate()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                    {dayEvents.slice(0, 3).map(ev => (
                      <span
                        key={`${ev.itemType}-${ev.id}-${ev.eventKind}`}
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 4px',
                          borderRadius: 4,
                          background: TYPE_COLORS[ev.itemType] || '#64748b',
                          color: '#fff',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={`${ev.title} (${ev.eventKind || ev.itemType})${ev.location ? ` @ ${ev.location}` : ''}`}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedDay && (
            <section style={{ ...card, marginTop: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: upshd.maroon }}>
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              {selectedEvents.length === 0 ? (
                <p style={{ margin: 0, color: '#94a3b8' }}>No events on this day.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
                  {selectedEvents.map(ev => (
                    <li key={`${ev.itemType}-${ev.id}-${ev.eventKind}`} style={listRow}>
                      <span style={{ ...dot, background: TYPE_COLORS[ev.itemType] }} />
                      <div style={{ flex: 1 }}>
                        <Link to={eventLink(ev)} style={{ color: upshd.maroon, fontWeight: 600, textDecoration: 'none' }}>
                          {ev.title}
                        </Link>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {ev.itemType} · {ev.eventKind}
                            {ev.location ? ` · ${ev.location}` : ''}
                            {ev.status && ev.itemType !== 'announcement' ? ` · ${ev.status}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
      {label}
    </span>
  )
}

const gridWrap = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '0.35rem',
  background: '#fff',
  padding: '0.75rem',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,.06)'
}

const weekdayHead = { textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#64748b', padding: '0.35rem' }
const emptyCell = { minHeight: 72, background: '#f8fafc', borderRadius: 8 }
const dayCell = {
  minHeight: 72,
  padding: '0.35rem',
  borderRadius: 8,
  border: '2px solid #e2e8f0',
  cursor: 'pointer',
  textAlign: 'left',
  display: 'block',
  width: '100%'
}

const card = { background: '#fff', borderRadius: 12, padding: '1rem 1.15rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const listRow = { display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }
const dot = { width: 8, height: 8, borderRadius: 999, marginTop: 6, flexShrink: 0 }
const navBtn = { width: 36, height: 36, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }
const ghostBtn = { padding: '0.45rem 0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
