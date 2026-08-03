/** Notify bell, sidebar badge, and toast watcher to refresh immediately. */
export function dispatchNotificationsChanged() {
  window.dispatchEvent(new Event('iqadms-notifications-changed'))
}

/** Ask open task boards to reload (same tab or other tabs). */
export function dispatchTasksChanged() {
  window.dispatchEvent(new Event('iqadms-tasks-changed'))
}
