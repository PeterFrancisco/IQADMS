export const EVENT_TYPE_COLORS = {
  task: '#7a0019',
  project: '#0ea5e9',
  accreditation: '#9333ea',
  announcement: '#c2410c'
}

export const EVENT_TYPE_LABELS = {
  task: 'Task due',
  project: 'Project start / due',
  accreditation: 'Accreditation',
  announcement: 'PQAD announcements'
}

export const ANNOUNCEMENT_CATEGORY_COLORS = {
  Orientation: '#7a0019',
  Meeting: '#0ea5e9',
  'PACUCOA Visit': '#9333ea',
  General: '#64748b'
}

export function dateKey(d) {
  if (typeof d === 'string') return d.slice(0, 10)
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayDateKey() {
  return dateKey(new Date())
}

export function parseDateKey(key) {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDateOnly(iso) {
  if (!iso) return ''
  const parsed = parseDateKey(iso)
  if (!parsed) return iso
  return parsed.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDateRange(startDate, endDate) {
  if (!startDate) return ''
  if (endDate && endDate !== startDate) {
    return `${formatDateOnly(startDate)} to ${formatDateOnly(endDate)}`
  }
  return formatDateOnly(startDate)
}

export function eventLink(event) {
  if (event.itemType === 'task') return `/my-tasks?task=${event.id}`
  if (event.itemType === 'project') return `/my-tasks?project=${event.id}`
  if (event.itemType === 'announcement') return `/announcements?id=${event.id}`
  return '/dashboard'
}

export function eventTypeLabel(event) {
  if (event.itemType === 'announcement') return event.category || event.eventKind || 'Announcement'
  if (event.itemType === 'task') return 'Task due'
  if (event.itemType === 'project') {
    return event.eventKind === 'start' ? 'Project start' : 'Project due'
  }
  if (event.itemType === 'accreditation') {
    return event.eventKind === 'deadline' ? 'Accreditation deadline' : 'Accreditation start'
  }
  return event.eventKind || event.itemType
}

export function isAnnouncementPast(announcement, today) {
  const todayKey = today instanceof Date ? dateKey(today) : todayDateKey()
  const end = announcement.endDate || announcement.startDate
  if (!end) return false
  return String(end).slice(0, 10) < todayKey
}

export function isAnnouncementUpcoming(announcement, today) {
  return !isAnnouncementPast(announcement, today)
}
