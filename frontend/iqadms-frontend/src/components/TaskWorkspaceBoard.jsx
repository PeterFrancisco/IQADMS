import { useEffect, useRef, useState } from 'react'
import '../theme/workspace-board.css'

const STATUS_OPTIONS = ['To Do', 'In Progress', 'Waiting', 'Completed', 'Cancelled']
const STATUS_COLORS = {
  'To Do': '#7a0019',
  Planning: '#7a0019',
  'In Progress': '#f59e0b',
  Waiting: '#9333ea',
  Review: '#9333ea',
  Completed: '#16a34a',
  Done: '#16a34a',
  Cancelled: '#64748b'
}

function statusColor(status) {
  return STATUS_COLORS[status] || '#64748b'
}

function statusOptionsFor(task) {
  if (task?.status && !STATUS_OPTIONS.includes(task.status)) {
    return [task.status, ...STATUS_OPTIONS]
  }
  return STATUS_OPTIONS
}

export default function TaskWorkspaceBoard({
  columns,
  tasks,
  members,
  loading,
  sortConfig,
  onSort,
  onRenameColumn,
  onToggleWrap,
  onDeleteColumn,
  onAddColumnRight,
  onCreateTask,
  onOpenTask,
  onAssign,
  onStatus,
  onDueDate,
  onTitleChange,
  getCellValue,
  saveCellValue
}) {
  const [headerMenu, setHeaderMenu] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    const close = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setHeaderMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (loading) return <p>Loading workspace…</p>

  const colCount = columns.length + 1

  return (
    <div className="workspace-board-shell">
      <div className="workspace-board-scroll">
        <table className="workspace-board-table">
          <thead>
            <tr>
              <th className="workspace-board-th workspace-board-th-actions" />
              {columns.map(col => (
                <th
                  key={col.id}
                  className={`workspace-board-th ${col.wrapText ? 'wrap-text' : ''}`}
                  style={{ minWidth: col.widthPx || 180, width: col.widthPx || 180 }}
                >
                  <div className="workspace-col-header">
                    {renamingId === col.id ? (
                      <input
                        className="workspace-col-rename-input"
                        value={renameDraft}
                        autoFocus
                        onChange={e => setRenameDraft(e.target.value)}
                        onBlur={() => {
                          if (renameDraft.trim() && renameDraft !== col.name) {
                            onRenameColumn(col.id, renameDraft.trim())
                          }
                          setRenamingId(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur()
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="workspace-col-title"
                        onDoubleClick={() => {
                          setRenamingId(col.id)
                          setRenameDraft(col.name)
                        }}
                        title="Double-click to rename"
                      >
                        {col.name}
                        {sortConfig?.columnId === col.id && (
                          <span className="workspace-sort-indicator">
                            {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className="workspace-col-menu-btn"
                      aria-label={`Column options for ${col.name}`}
                      onClick={() => setHeaderMenu(headerMenu === col.id ? null : col.id)}
                    >
                      ⋮
                    </button>
                    {headerMenu === col.id && (
                      <div className="workspace-col-menu" ref={menuRef}>
                        <button type="button" onClick={() => { onSort(col.id, 'asc'); setHeaderMenu(null) }}>
                          Sort A → Z
                        </button>
                        <button type="button" onClick={() => { onSort(col.id, 'desc'); setHeaderMenu(null) }}>
                          Sort Z → A
                        </button>
                        <button type="button" onClick={() => { onToggleWrap(col.id, !col.wrapText); setHeaderMenu(null) }}>
                          {col.wrapText ? 'Disable wrap text' : 'Wrap text'}
                        </button>
                        <button type="button" onClick={() => { onAddColumnRight(col.id); setHeaderMenu(null) }}>
                          Add column to the right
                        </button>
                        {!col.isLocked && (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => { onDeleteColumn(col.id, col.name); setHeaderMenu(null) }}
                          >
                            Delete column
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              <th className="workspace-board-th workspace-board-th-actions">
                <button type="button" className="workspace-plus-btn" title="Add column at end" onClick={() => onAddColumnRight(null)}>
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="workspace-add-row">
              <td>
                <button type="button" className="workspace-plus-btn" title="Create task" onClick={onCreateTask}>
                  +
                </button>
              </td>
              <td colSpan={colCount - 1}>
                <button type="button" className="workspace-add-row-label" onClick={onCreateTask}>
                  Add task
                </button>
              </td>
            </tr>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="workspace-empty">
                  No tasks yet. Click + to create one.
                </td>
              </tr>
            ) : (
              tasks.map(task => (
                <tr key={task.id}>
                  <td />
                  {columns.map(col => (
                    <td
                      key={col.id}
                      className={col.wrapText ? 'wrap-text' : 'nowrap-cell'}
                      style={{ minWidth: col.widthPx || 180 }}
                    >
                      <BoardCell
                        column={col}
                        task={task}
                        members={members}
                        getCellValue={getCellValue}
                        saveCellValue={saveCellValue}
                        onOpenTask={onOpenTask}
                        onAssign={onAssign}
                        onStatus={onStatus}
                        onDueDate={onDueDate}
                        onTitleChange={onTitleChange}
                      />
                    </td>
                  ))}
                  <td />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BoardCell({
  column,
  task,
  members,
  getCellValue,
  saveCellValue,
  onOpenTask,
  onAssign,
  onStatus,
  onDueDate,
  onTitleChange
}) {
  const binding = column.binding || ''

  if (binding === 'task') {
    return (
      <TaskTitleCell task={task} onOpenTask={onOpenTask} onTitleChange={onTitleChange} />
    )
  }

  if (binding === 'owner') {
    return (
      <select
        className="workspace-cell-input"
        value={task.assignedToUserId || ''}
        onChange={e => onAssign(task.id, e.target.value || null)}
      >
        <option value="">Unassigned</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>
            {m.displayName || m.username}
          </option>
        ))}
      </select>
    )
  }

  if (binding === 'status') {
    return (
      <select
        className="workspace-cell-input workspace-status-select"
        style={{ background: statusColor(task.status), color: '#fff', fontWeight: 600 }}
        value={task.status}
        onChange={e => onStatus(task.id, e.target.value)}
      >
        {statusOptionsFor(task).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    )
  }

  if (binding === 'due_date') {
    return (
      <input
        type="date"
        className="workspace-cell-input"
        value={task.dueDate || ''}
        onChange={e => onDueDate(task.id, e.target.value || null)}
      />
    )
  }

  return (
    <CustomCell
      column={column}
      taskId={task.id}
      value={getCellValue(task.id, column.id)}
      onSave={saveCellValue}
    />
  )
}

function TaskTitleCell({ task, onOpenTask, onTitleChange }) {
  const [local, setLocal] = useState(task.title)

  useEffect(() => setLocal(task.title), [task.title])

  return (
    <div className="workspace-task-title">
      <input
        className="workspace-cell-input workspace-task-input"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          if (local.trim() && local !== task.title) onTitleChange(task.id, local.trim())
        }}
      />
      <button type="button" className="workspace-task-open" onClick={() => onOpenTask(task)} title="Open details">
        ↗
      </button>
      {task.commentCount > 0 && (
        <span className="workspace-task-meta">{task.commentCount} comments</span>
      )}
    </div>
  )
}

function CustomCell({ column, taskId, value, onSave }) {
  const [local, setLocal] = useState(value || '')

  useEffect(() => setLocal(value || ''), [value])

  const commit = () => onSave(taskId, column.id, local)

  if (column.columnType === 'link') {
    return (
      <div>
        <input
          className="workspace-cell-input"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          placeholder="https://..."
        />
      </div>
    )
  }

  if (column.columnType === 'date') {
    return (
      <input
        type="date"
        className="workspace-cell-input"
        value={local}
        onChange={e => {
          setLocal(e.target.value)
          onSave(taskId, column.id, e.target.value)
        }}
      />
    )
  }

  if (column.columnType === 'number') {
    return (
      <input
        type="number"
        className="workspace-cell-input"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
      />
    )
  }

  if (column.columnType === 'dropdown') {
    const options = column.options || []
    return (
      <select
        className="workspace-cell-input"
        value={local}
        onChange={e => {
          setLocal(e.target.value)
          onSave(taskId, column.id, e.target.value)
        }}
      >
        <option value="">—</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      className="workspace-cell-input"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      placeholder="…"
    />
  )
}
