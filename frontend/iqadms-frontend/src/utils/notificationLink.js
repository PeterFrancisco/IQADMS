export const NO_PROJECT_SECTION = '__none__'

/** Build a task-board URL that opens the correct project table and task detail. */
export function buildTaskBoardLink(taskId, projectId) {
  if (!taskId) return '/my-tasks'
  const project =
    projectId && String(projectId).trim() ? String(projectId) : NO_PROJECT_SECTION
  return `/my-tasks?task=${taskId}&project=${project}`
}

/** Prefer stored linkPath; fall back to related task/project ids from the API. */
export function resolveNotificationLink(notification) {
  const n = notification || {}
  const taskId = n.relatedTaskId
  const projectId = n.relatedProjectId

  if (n.linkPath) {
    const path = n.linkPath
    if (path.includes('task=') && path.includes('project=')) return path
    if (path.includes('task=') && taskId) {
      return buildTaskBoardLink(taskId, projectId)
    }
    return path
  }

  if (taskId) return buildTaskBoardLink(taskId, projectId)
  return '/notifications'
}

export function effectiveTaskSectionId(task, activeProjectIds) {
  const pid = task?.projectId ?? task?.ProjectId ?? ''
  if (!pid) return NO_PROJECT_SECTION
  if (activeProjectIds && !activeProjectIds.has(String(pid))) return NO_PROJECT_SECTION
  return String(pid)
}

export function countOrphanTasks(tasks, activeProjectIds) {
  return (tasks || []).filter(t => effectiveTaskSectionId(t, activeProjectIds) === NO_PROJECT_SECTION)
    .length
}
