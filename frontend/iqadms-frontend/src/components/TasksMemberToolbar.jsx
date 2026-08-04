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

export default function TasksMemberToolbar({
  projects,
  projectFilter,
  onProjectFilterChange,
  statusFilter,
  onStatusFilterChange,
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
    projectFilter || statusFilter !== 'all' || searchQuery.trim()

  return (
    <div className="tasks-admin-toolbar">
      <div className="tasks-admin-toolbar__row tasks-admin-toolbar__row--primary">
        <div className="tasks-admin-toolbar__search">
          <AppIcon name="search" size={18} className="tasks-admin-toolbar__search-icon" />
          <input
            type="search"
            placeholder="Search your tasks…"
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
            All projects
          </button>
          <button
            type="button"
            className={viewMode === 'focus' ? 'is-active' : ''}
            onClick={() => onViewModeChange('focus')}
            disabled={!focusProjectId && viewMode !== 'focus'}
          >
            <AppIcon name="list" size={16} />
            Single project
          </button>
        </div>
      </div>

      <div className="tasks-admin-toolbar__row">
        <label className="tasks-admin-toolbar__field">
          <span>
            Project
            <HintButton title="Project filter" className="tasks-toolbar-hint" align="right" compact size={14}>
              <p>Show tasks from one project board only, or choose No project for unassigned tasks.</p>
            </HintButton>
          </span>
          <select value={projectFilter} onChange={e => onProjectFilterChange(e.target.value)}>
            <option value="">All projects</option>
            <option value="__none__">No project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="tasks-admin-toolbar__field">
          <span>
            Status
            <HintButton title="Task status" className="tasks-toolbar-hint" align="right" compact size={14}>
              <ul>
                <li><strong>To Do</strong> — ready to start</li>
                <li><strong>In Progress</strong> — you are working on it</li>
                <li><strong>Submitted</strong> — waiting for PQAD review</li>
                <li><strong>Returned</strong> — needs revision</li>
                <li><strong>Completed</strong> — approved</li>
              </ul>
            </HintButton>
          </span>
          <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Submitted">Submitted</option>
            <option value="Returned">Returned</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <label className="tasks-admin-toolbar__field">
          <span>Sort</span>
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
            All projects
          </button>
        ) : null}
        <span>
          Showing <strong>{filteredTaskCount}</strong>
          {filteredTaskCount !== totalTaskCount ? ` of ${totalTaskCount}` : ''} assigned tasks
        </span>
      </div>
    </div>
  )
}
