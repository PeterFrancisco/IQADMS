import AppIcon from './AppIcon'

function isCompletedStatus(status) {
  return status === 'Completed' || status === 'Done'
}

function computeStats(tasks) {
  const total = tasks.length
  const done = tasks.filter(
    t => t.status === 'Submitted' || isCompletedStatus(t.status)
  ).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const inProgress = tasks.filter(t => t.status === 'In Progress').length
  const submitted = tasks.filter(t => t.status === 'Submitted').length
  return { total, done, percent, inProgress, submitted }
}

export default function ProjectTaskBoardCard({
  projectTitle,
  projectStatus,
  projectPriority,
  tasks,
  children,
  onOpenFocus,
  onCreateTask,
  onDeleteProject,
  focusLabel = 'Focus board',
  subtitle
}) {
  const stats = computeStats(tasks)
  const ringStyle = {
    background: `conic-gradient(#7a0019 ${stats.percent * 3.6}deg, #e2e8f0 0deg)`
  }

  return (
    <article className="project-task-board-card">
      <header className="project-task-board-card__header">
        <div className="project-task-board-card__title-block">
          <div className="project-task-board-card__progress-ring" style={ringStyle} aria-hidden>
            <div className="project-task-board-card__progress-inner">
              <span className="project-task-board-card__progress-value">{stats.percent}%</span>
            </div>
          </div>
          <div>
            <h2 className="project-task-board-card__title">{projectTitle}</h2>
            {subtitle && <p className="project-task-board-card__subtitle">{subtitle}</p>}
            <div className="project-task-board-card__badges">
              {projectStatus && <span className="project-task-board-card__badge">{projectStatus}</span>}
              {projectPriority && (
                <span className="project-task-board-card__badge project-task-board-card__badge--muted">
                  {projectPriority}
                </span>
              )}
              <span className="project-task-board-card__badge project-task-board-card__badge--muted">
                {stats.done}/{stats.total} submitted or done
              </span>
            </div>
          </div>
        </div>
        <div className="project-task-board-card__actions">
          {onCreateTask && (
            <button type="button" className="project-task-board-card__btn" onClick={onCreateTask}>
              <AppIcon name="plus" size={16} />
              Add task
            </button>
          )}
          {onOpenFocus && (
            <button type="button" className="project-task-board-card__btn project-task-board-card__btn--ghost" onClick={onOpenFocus}>
              <AppIcon name="maximize" size={16} />
              {focusLabel}
            </button>
          )}
          {onDeleteProject && (
            <button
              type="button"
              className="project-task-board-card__btn project-task-board-card__btn--danger"
              onClick={onDeleteProject}
            >
              Delete project
            </button>
          )}
        </div>
      </header>

      <div className="project-task-board-card__chips">
        <span className="project-task-board-card__chip">
          <span className="project-task-board-card__dot" style={{ background: '#7a0019' }} />
          To do {tasks.filter(t => t.status === 'To Do' || t.status === 'Planning').length}
        </span>
        <span className="project-task-board-card__chip">
          <span className="project-task-board-card__dot" style={{ background: '#f59e0b' }} />
          In progress {stats.inProgress}
        </span>
        <span className="project-task-board-card__chip">
          <span className="project-task-board-card__dot" style={{ background: '#2563eb' }} />
          Submitted {stats.submitted}
        </span>
        <span className="project-task-board-card__chip">
          <span className="project-task-board-card__dot" style={{ background: '#16a34a' }} />
          Completed {tasks.filter(t => isCompletedStatus(t.status)).length}
        </span>
      </div>

      <div className="project-task-board-card__board">{children}</div>
    </article>
  )
}
