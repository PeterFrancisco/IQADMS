import PlaceholderPage from '../components/PlaceholderPage'

export function ProjectsPage() {
  return (
    <PlaceholderPage
      title="Projects"
      subtitle="Group tasks under initiatives such as PACUCOA 2026. Each project has title, dates, status, priority, PQAD members, and related departments."
      planned={[
        'Project list and detail views',
        'Link tasks to a project',
        'PACUCOA 2026 sample project',
        'Staff and department metadata (not department assignees)'
      ]}
    />
  )
}

export function UpcomingDeadlinesPage() {
  return (
    <PlaceholderPage
      title="Upcoming Deadlines"
      subtitle="Consolidated due dates from tasks, meetings, and accreditation milestones."
      planned={['Due this week / overdue filters', 'Calendar integration', 'PQAD staff workload view']}
    />
  )
}

export function RecentActivitiesPage() {
  return (
    <PlaceholderPage
      title="Recent Activities"
      subtitle="Task updates, file uploads, comments, and project changes across PQAD."
      planned={['Activity log feed', 'Filter by project or staff', 'Link to task detail']}
    />
  )
}

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

export function StatisticsPage() {
  return (
    <PlaceholderPage
      title="Statistics"
      subtitle="Completion rates, overdue counts, and workload summaries for PQAD."
      planned={['My Tasks summary widgets', 'Admin: office-wide metrics', 'Charts by project and department']}
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
