import { getActivityStatus } from '../utils/activityStatus'
import '../theme/activity-status.css'

export default function ActivityStatusText({ presence, lastActiveAt, className = '' }) {
  const { label, active } = getActivityStatus({ presence, lastActiveAt })
  return (
    <span
      className={`activity-status-text ${active ? 'is-active' : 'is-inactive'} ${className}`.trim()}
    >
      {label}
    </span>
  )
}
