import AppIcon from './AppIcon'
import HintButton from './HintButton'

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Project name (A–Z)' },
  { value: 'title-desc', label: 'Project name (Z–A)' },
  { value: 'progress-desc', label: 'Progress (high first)' },
  { value: 'progress-asc', label: 'Progress (low first)' },
  { value: 'tasks-desc', label: 'Most tasks' },
  { value: 'tasks-asc', label: 'Fewest tasks' }
]

export default function TasksAdminToolbar({
  projects,
  departments,
  members,
  projectFilter,
  onProjectFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  statusFilter,
  onStatusFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortKey,
  onSortKeyChange,
  onClearFilters,
  filteredTaskCount,
  totalTaskCount,
  viewMode,
  onViewModeChange,
  focusProjectId,
  onExitFocus
}) {
  const hasActiveFilters =
    projectFilter ||
    departmentFilter ||
    statusFilter !== 'all' ||
    assigneeFilter ||
    searchQuery.trim()

  return (
    <div className="tasks-admin-toolbar">
      <div className="tasks-admin-toolbar__row tasks-admin-toolbar__row--primary">
        <div className="tasks-admin-toolbar__search">
          <AppIcon name="search" size={18} className="tasks-admin-toolbar__search-icon" />
          <input
            type="search"
            placeholder="Search tasks by title…"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            aria-label="Search tasks"
          />
        </div>
        <div className="tasks-admin-toolbar__view-toggle" role="group" aria-label="Board layout">
          <button
            type="button"
            className={viewMode === 'cards' ? 'is-active' : ''}
            onClick={() => onViewModeChange('cards')}
          >
            <AppIcon name="grid" size={16} />
            All boards
          </button>
          <button
            type="button"
            className={viewMode === 'focus' ? 'is-active' : ''}
            onClick={() => onViewModeChange('focus')}
            disabled={!focusProjectId && viewMode !== 'focus'}
            title={focusProjectId ? 'Single project board' : 'Open a project board first'}
          >
            <AppIcon name="list" size={16} />
            Focus
          </button>
        </div>
      </div>

      <div className="tasks-admin-toolbar__row">
        <label className="tasks-admin-toolbar__field">
          <span>Project</span>
          <select value={projectFilter} onChange={e => onProjectFilterChange(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
            <option value="__none__">No project</option>
          </select>
        </label>
        <label className="tasks-admin-toolbar__field">
          <span>Department</span>
          <select value={departmentFilter} onChange={e => onDepartmentFilterChange(e.target.value)}>
            <option value="">All</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="tasks-admin-toolbar__field">
          <span>
            Status
            <HintButton title="Task workflow" className="tasks-toolbar-hint" align="right">
              <p>Filter by workflow stage: To Do, Waiting, In Progress, Submitted, Returned, Completed, or Cancelled.</p>
            </HintButton>
          </span>
          <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Submitted">Submitted</option>
            <option value="Returned">Returned</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>
        <label className="tasks-admin-toolbar__field">
          <span>Assignee</span>
          <select value={assigneeFilter} onChange={e => onAssigneeFilterChange(e.target.value)}>
            <option value="">Anyone</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.displayName || m.username}
              </option>
            ))}
          </select>
        </label>
        <label className="tasks-admin-toolbar__field">
          <span>Sort boards</span>
          <select value={sortKey} onChange={e => onSortKeyChange(e.target.value)}>
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button type="button" className="tasks-admin-toolbar__clear" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="tasks-admin-toolbar__meta">
        {focusProjectId && viewMode === 'focus' ? (
          <button type="button" className="tasks-admin-toolbar__back" onClick={onExitFocus}>
            <AppIcon name="arrowLeft" size={16} />
            All project boards
          </button>
        ) : null}
        <span>
          Showing <strong>{filteredTaskCount}</strong>
          {filteredTaskCount !== totalTaskCount ? ` of ${totalTaskCount}` : ''} tasks
        </span>
      </div>
    </div>
  )
}
