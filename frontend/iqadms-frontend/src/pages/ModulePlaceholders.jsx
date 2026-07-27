import PlaceholderPage from '../components/PlaceholderPage'

export function NotificationsPage() {
  return (
    <PlaceholderPage
      title="Notifications"
      subtitle="Work alerts for staff; system and account alerts for administrators."
      planned={[
        'Task assigned / due today / overdue',
        'Project updates and meeting reminders',
        'Admin: account requests and registrations'
      ]}
    />
  )
}

export function CalendarPage() {
  return (
    <PlaceholderPage
      title="Calendar"
      subtitle="Due dates, CHED meetings, campus visits, and accreditation schedules in one view."
      planned={['Month / week views', 'Sync task due dates', 'Meeting and visit entries']}
    />
  )
}

export function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      subtitle="Generate department performance, task completion, staff workload, and monthly summaries."
      planned={['Export PDF and Excel', 'Filters by project, department, and date', 'Submission summary reports']}
    />
  )
}

export function RequestsPage() {
  return (
    <PlaceholderPage
      title="Requests"
      subtitle="Central hub for account, document, department, and extension requests."
      planned={[
        'Account request (current flow)',
        'Document request from departments',
        'Extension request for task deadlines'
      ]}
    />
  )
}
