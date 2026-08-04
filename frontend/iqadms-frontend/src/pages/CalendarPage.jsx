import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { ghostButtonStyle } from '../theme/pageStyles'
import '../theme/calendar-page.css'
import { appDialog } from '../utils/appDialog'
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  dateKey,
  eventLink,
  eventTypeLabel,
  parseDateKey
} from '../utils/calendarEvents'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ALL_TYPES = Object.keys(EVENT_TYPE_COLORS)

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleString('en-PH', { month: 'long', year: 'numeric' })
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

export default function CalendarPage() {
  const now = new Date()
  const todayKey = dateKey(now)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialDate = parseDateKey(searchParams.get('date'))
  const [year, setYear] = useState(initialDate?.getFullYear() ?? now.getFullYear())
  const [month, setMonth] = useState((initialDate?.getMonth() ?? now.getMonth()) + 1)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(initialDate)
  const [activeTypes, setActiveTypes] = useState(() => new Set(ALL_TYPES))
  const [viewMode, setViewMode] = useState('month')

  useEffect(() => {
    loadEvents()
  }, [year, month])

  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (!dateParam) return
    const parsed = parseDateKey(dateParam)
    if (!parsed) return
    setSelectedDay(parsed)
    setYear(parsed.getFullYear())
    setMonth(parsed.getMonth() + 1)
  }, [searchParams])

  async function loadEvents() {
    try {
      setLoading(true)
      const res = await api.get('/Dashboard/calendar-events', { params: { year, month } })
      setEvents(res.data)
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to load calendar.')
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = useMemo(
    () => events.filter(e => activeTypes.has(e.itemType)),
    [events, activeTypes]
  )

  const eventsByDate = useMemo(() => {
    const map = {}
    filteredEvents.forEach(e => {
      const key = e.date
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [filteredEvents])

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])

  const agendaDays = useMemo(() => {
    const keys = Object.keys(eventsByDate).sort()
    return keys.map(key => ({
      key,
      date: parseDateKey(key),
      events: eventsByDate[key]
    }))
  }, [eventsByDate])

  function shiftMonth(delta) {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
    setSelectedDay(null)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('date')
      return next
    }, { replace: true })
  }

  function goToday() {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth() + 1)
    selectDay(t)
  }

  function selectDay(day) {
    setSelectedDay(day)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('date', dateKey(day))
      return next
    }, { replace: true })
  }

  function toggleType(type) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size === 1) return prev
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function openEvent(ev, e) {
    e?.stopPropagation?.()
    navigate(eventLink(ev))
  }

  const selectedEvents = selectedDay ? eventsByDate[dateKey(selectedDay)] || [] : []
  const showAgenda = viewMode === 'agenda'

  return (
    <DashboardLayout>
      <header className="calendar-page-header">
        <h1>Calendar</h1>
        <p>Task due dates, project milestones, accreditation schedules, and PQAD announcements.</p>
      </header>

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <strong className="calendar-month-label">{monthLabel(year, month)}</strong>
          <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="calendar-toolbar-actions">
          <div className="calendar-view-toggle" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={viewMode === 'month' ? 'is-active' : ''}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              type="button"
              className={viewMode === 'agenda' ? 'is-active' : ''}
              onClick={() => setViewMode('agenda')}
            >
              Agenda
            </button>
          </div>
          <button type="button" style={ghostButtonStyle} onClick={goToday}>
            Today
          </button>
          <Link to="/announcements" style={{ ...ghostButtonStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Announcements
          </Link>
        </div>
      </div>

      <div className="calendar-legend" role="group" aria-label="Event type filters">
        {ALL_TYPES.map(type => (
          <button
            key={type}
            type="button"
            className={`calendar-legend-item${activeTypes.has(type) ? '' : ' is-off'}`}
            onClick={() => toggleType(type)}
            aria-pressed={activeTypes.has(type)}
          >
            <span className="calendar-legend-dot" style={{ background: EVENT_TYPE_COLORS[type] }} />
            {EVENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="calendar-skeleton-grid" aria-busy="true" aria-label="Loading calendar">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="calendar-skeleton-cell" />
          ))}
        </div>
      ) : (
        <div className={`calendar-layout${selectedDay && !showAgenda ? ' has-selection' : ''}`}>
          <div>
            {!showAgenda && (
              <div className="calendar-grid-wrap">
                {WEEKDAYS.map(w => (
                  <div key={w} className="calendar-weekday-head">
                    {w}
                  </div>
                ))}
                {cells.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="calendar-empty-cell" />
                  }
                  const key = dateKey(day)
                  const dayEvents = eventsByDate[key] || []
                  const isToday = key === todayKey
                  const isSelected = selectedDay && dateKey(selectedDay) === key

                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => selectDay(day)}
                      className={`calendar-day-cell${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                      aria-pressed={isSelected}
                      aria-label={`${day.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`}
                    >
                      <div className="calendar-day-num">{day.getDate()}</div>
                      <div className="calendar-day-events">
                        {dayEvents.slice(0, 3).map(ev => (
                          <button
                            key={`${ev.itemType}-${ev.id}-${ev.eventKind}-${ev.date}`}
                            type="button"
                            className="calendar-event-chip"
                            style={{ background: EVENT_TYPE_COLORS[ev.itemType] || '#64748b' }}
                            title={`${ev.title} (${eventTypeLabel(ev)})${ev.location ? ` @ ${ev.location}` : ''}`}
                            onClick={e => openEvent(ev, e)}
                          >
                            {ev.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="calendar-more-count">+{dayEvents.length - 3} more</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className={`calendar-agenda${showAgenda ? ' is-visible' : ''}`}>
              {agendaDays.length === 0 ? (
                <div className="calendar-detail-panel">
                  <p className="calendar-detail-empty">No events this month with the current filters.</p>
                </div>
              ) : (
                agendaDays.map(({ key, date, events: dayEvents }) => (
                  <section key={key} className="calendar-agenda-day">
                    <div className="calendar-agenda-day-head">
                      <strong>
                        {date?.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </strong>
                      <span>{dayEvents.length} event{dayEvents.length === 1 ? '' : 's'}</span>
                    </div>
                    <ul className="calendar-event-list">
                      {dayEvents.map(ev => (
                        <li key={`${ev.itemType}-${ev.id}-${ev.eventKind}-${ev.date}`} className="calendar-event-row">
                          <span className="calendar-event-dot" style={{ background: EVENT_TYPE_COLORS[ev.itemType] }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link to={eventLink(ev)} className="calendar-event-row-title">
                              {ev.title}
                            </Link>
                            <div className="calendar-event-row-meta">
                              {eventTypeLabel(ev)}
                              {ev.location ? ` · ${ev.location}` : ''}
                              {ev.status && ev.itemType !== 'announcement' ? ` · ${ev.status}` : ''}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </div>

          {!showAgenda && selectedDay && (
            <aside className="calendar-detail-panel">
              <h2>
                {selectedDay.toLocaleDateString('en-PH', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h2>
              {selectedEvents.length === 0 ? (
                <p className="calendar-detail-empty">No events on this day.</p>
              ) : (
                <ul className="calendar-event-list">
                  {selectedEvents.map(ev => (
                    <li key={`${ev.itemType}-${ev.id}-${ev.eventKind}-${ev.date}`} className="calendar-event-row">
                      <span className="calendar-event-dot" style={{ background: EVENT_TYPE_COLORS[ev.itemType] }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={eventLink(ev)} className="calendar-event-row-title">
                          {ev.title}
                        </Link>
                        <div className="calendar-event-row-meta">
                          {eventTypeLabel(ev)}
                          {ev.location ? ` · ${ev.location}` : ''}
                          {ev.status && ev.itemType !== 'announcement' ? ` · ${ev.status}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {selectedEvents.some(ev => ev.itemType === 'announcement') && (
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
                  <Link to="/announcements" style={{ color: 'var(--upshd-maroon, #7a0019)', fontWeight: 600 }}>
                    Manage announcements
                  </Link>
                </p>
              )}
            </aside>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
