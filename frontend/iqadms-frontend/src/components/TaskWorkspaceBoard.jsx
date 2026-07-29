import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import UserAvatar from './UserAvatar'
import '../theme/workspace-board.css'

const STATUS_OPTIONS_ADMIN = ['To Do', 'In Progress', 'Submitted', 'Completed', 'Cancelled']
const STATUS_COLORS = {
  'To Do': '#7a0019',
  Planning: '#7a0019',
  'In Progress': '#f59e0b',
  Submitted: '#2563eb',
  Waiting: '#9333ea',
  Review: '#9333ea',
  Completed: '#16a34a',
  Done: '#16a34a',
  Cancelled: '#64748b'
}

function statusColor(status) {
  return STATUS_COLORS[status] || '#64748b'
}

function isCompletedStatus(status) {
  return status === 'Completed' || status === 'Done'
}

function statusOptionsFor(task, isAdmin, currentUserId) {
  const base = isAdmin ? STATUS_OPTIONS_ADMIN : ['To Do', 'In Progress']
  const list = task?.status && !base.includes(task.status) ? [task.status, ...base] : base
  if (!isAdmin && task?.assignedToUserId !== currentUserId) return [task?.status || 'To Do']
  return list
}

function canChangeStatus(task, isAdmin, currentUserId) {
  if (isAdmin) return true
  return task?.assignedToUserId === currentUserId && !isCompletedStatus(task?.status) && task?.status !== 'Submitted'
}

function columnBinding(col) {
  return (col?.binding ?? col?.Binding ?? '').toLowerCase()
}

function canDeleteColumn(col) {
  if (columnBinding(col) === 'task') return false
  if (col?.isLocked === true || col?.IsLocked === true) return false
  return true
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
  saveCellValue,
  isAdmin = false,
  currentUserId = '',
  onDeleteTask
}) {
  const [headerMenu, setHeaderMenu] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const menuRef = useRef(null)
  const menuTriggerRef = useRef(null)
  const scrollRef = useRef(null)

  const closeHeaderMenu = () => {
    setHeaderMenu(null)
    setMenuAnchor(null)
  }

  const openHeaderMenu = (colId, triggerEl) => {
    if (headerMenu === colId) {
      closeHeaderMenu()
      return
    }
    menuTriggerRef.current = triggerEl
    const rect = triggerEl.getBoundingClientRect()
    setMenuAnchor({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 208)
    })
    setHeaderMenu(colId)
  }

  useEffect(() => {
    const close = e => {
      if (menuRef.current?.contains(e.target)) return
      if (menuTriggerRef.current?.contains(e.target)) return
      closeHeaderMenu()
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => closeHeaderMenu()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) return <p>Loading workspace…</p>

  const colCount = columns.length + 1
  const menuColumn = headerMenu ? columns.find(c => c.id === headerMenu) : null

  return (
    <div className="workspace-board-shell">
      <div className="workspace-board-scroll" ref={scrollRef}>
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
                            onRenameColumn?.(col.id, renameDraft.trim())
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
                          if (!isAdmin) return
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
                    {isAdmin && (
                    <button
                      type="button"
                      className="workspace-col-menu-btn"
                      aria-label={`Column options for ${col.name}`}
                      aria-expanded={headerMenu === col.id}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => openHeaderMenu(col.id, e.currentTarget)}
                    >
                      ⋮
                    </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="workspace-board-th workspace-board-th-actions">
                {isAdmin && (
                  <button type="button" className="workspace-plus-btn" title="Add column at end" onClick={() => onAddColumnRight(null)}>
                    +
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="workspace-add-row">
              {isAdmin && (
                <>
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
                </>
              )}
            </tr>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="workspace-empty">
                  {isAdmin ? 'No tasks yet. Click + to create one.' : 'No tasks assigned to you yet.'}
                </td>
              </tr>
            ) : (
              tasks.map(task => (
                <tr key={task.id}>
                  <td>
                    {isAdmin && onDeleteTask && (
                      <button
                        type="button"
                        className="workspace-plus-btn"
                        title="Delete task"
                        onClick={() => onDeleteTask(task)}
                        style={{ color: '#dc2626', fontWeight: 700 }}
                      >
                        ×
                      </button>
                    )}
                  </td>
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
                        isAdmin={isAdmin}
                        currentUserId={currentUserId}
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

      {menuColumn &&
        menuAnchor &&
        createPortal(
          <div
            ref={menuRef}
            className="workspace-col-menu workspace-col-menu-fixed"
            style={{ top: menuAnchor.top, left: menuAnchor.left }}
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                onSort(menuColumn.id, 'asc')
                closeHeaderMenu()
              }}
            >
              Sort A → Z
            </button>
            <button
              type="button"
              onClick={() => {
                onSort(menuColumn.id, 'desc')
                closeHeaderMenu()
              }}
            >
              Sort Z → A
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleWrap(menuColumn.id, !menuColumn.wrapText)
                closeHeaderMenu()
              }}
            >
              {menuColumn.wrapText ? 'Disable wrap text' : 'Wrap text'}
            </button>
            <button
              type="button"
              onClick={() => {
                onAddColumnRight(menuColumn.id)
                closeHeaderMenu()
              }}
            >
              Add column to the right
            </button>
            <div className="workspace-col-menu-divider" />
            {canDeleteColumn(menuColumn) ? (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  onDeleteColumn(menuColumn.id, menuColumn.name)
                  closeHeaderMenu()
                }}
              >
                Delete column
              </button>
            ) : (
              <p className="workspace-col-menu-hint">Task column cannot be deleted.</p>
            )}
          </div>,
          document.body
        )}
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
  onTitleChange,
  isAdmin,
  currentUserId
}) {
  const binding = column.binding || ''

  if (binding === 'task') {
    return (
      <TaskTitleCell
        task={task}
        onOpenTask={onOpenTask}
        onTitleChange={onTitleChange}
        readOnly={!isAdmin}
      />
    )
  }

  if (binding === 'owner') {
    if (!isAdmin) {
      return <span>{task.assignedToName || '—'}</span>
    }
    return <OwnerCell task={task} members={members} onAssign={onAssign} />
  }

  if (binding === 'status') {
    const disabled = !canChangeStatus(task, isAdmin, currentUserId)
    return (
      <select
        className="workspace-cell-input workspace-status-select"
        style={{ background: statusColor(task.status), color: '#fff', fontWeight: 600 }}
        value={task.status}
        disabled={disabled}
        onChange={e => onStatus(task.id, e.target.value)}
      >
        {statusOptionsFor(task, isAdmin, currentUserId).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    )
  }

  if (binding === 'due_date') {
    if (!isAdmin) {
      return <span>{task.dueDate || '—'}</span>
    }
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
      readOnly={!isAdmin}
    />
  )
}

function memberSearchText(m) {
  return [
    m.displayName,
    m.DisplayName,
    m.username,
    m.Username,
    m.email,
    m.Email,
    m.position,
    m.Position
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function filterMembersByQuery(members, query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const tokens = q.split(/\s+/).filter(Boolean)
  return members.filter(m => {
    const hay = memberSearchText(m)
    return tokens.every(t => hay.includes(t))
  })
}

function OwnerCell({ task, members, onAssign }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [anchor, setAnchor] = useState(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const openedRef = useRef(false)

  const owner = members.find(
    m => String(m.id || m.Id) === String(task.assignedToUserId)
  )
  const displayName = owner?.displayName || owner?.username || task.assignedToName || 'Assign owner'

  const filtered = filterMembersByQuery(members, query)
  const showResults = query.trim().length > 0

  const placePanel = () => {
    const btn = btnRef.current
    const panel = panelRef.current
    if (!btn || !panel) return

    const rect = btn.getBoundingClientRect()
    const panelHeight = panel.offsetHeight
    const panelWidth = panel.offsetWidth
    const gap = 6
    const margin = 8

    let top = rect.bottom + gap
    if (top + panelHeight > window.innerHeight - margin) {
      top = rect.top - panelHeight - gap
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - panelHeight - margin))

    let left = rect.left
    if (left + panelWidth > window.innerWidth - margin) {
      left = window.innerWidth - panelWidth - margin
    }
    left = Math.max(margin, left)

    setAnchor({ top, left })
  }

  useEffect(() => {
    if (!open) return undefined
    const onDoc = e => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) {
      openedRef.current = false
      return
    }
    if (!openedRef.current) {
      openedRef.current = true
      setQuery('')
      requestAnimationFrame(() => {
        searchRef.current?.focus()
        placePanel()
      })
    }
  }, [open])

  useLayoutEffect(() => {
    if (open) placePanel()
  }, [open, query, filtered.length, showResults])

  useEffect(() => {
    if (!open) return undefined
    const onReflow = () => placePanel()
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open, query, filtered.length, showResults])

  const openPicker = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      setAnchor({
        top: rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - 288)
      })
    }
    setOpen(true)
  }

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    openPicker()
  }

  const pick = userId => {
    onAssign(task.id, userId || null)
    setOpen(false)
  }

  return (
    <div className="workspace-owner-cell">
      <button
        type="button"
        ref={btnRef}
        className="workspace-owner-trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <UserAvatar
          member={owner || { displayName: '?' }}
          size={32}
          className="workspace-owner-avatar"
        />
        <span className="workspace-owner-name">{displayName}</span>
        <span className="workspace-owner-chevron" aria-hidden>▾</span>
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={panelRef}
            className="workspace-owner-picker"
            style={{ top: anchor.top, left: anchor.left }}
            role="listbox"
            aria-label="Assign owner"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="workspace-owner-picker-search">
              <input
                ref={searchRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Search by name, @username, or email…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                className="workspace-owner-search-input"
              />
            </div>
            <button type="button" className="workspace-owner-option" onClick={() => pick(null)}>
              <span className="workspace-owner-option-unassigned">—</span>
              <span>Unassigned</span>
            </button>
            <div className="workspace-owner-picker-list">
              {!showResults ? (
                <p className="workspace-owner-picker-hint">
                  Start typing to find a team member. Results appear as you search.
                </p>
              ) : filtered.length === 0 ? (
                <p className="workspace-owner-picker-empty">No members match &ldquo;{query.trim()}&rdquo;.</p>
              ) : (
                filtered.map(m => {
                  const id = m.id || m.Id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={String(id) === String(task.assignedToUserId)}
                      className={`workspace-owner-option ${String(id) === String(task.assignedToUserId) ? 'selected' : ''}`}
                      onClick={() => pick(id)}
                    >
                      <UserAvatar member={m} size={28} />
                      <span className="workspace-owner-option-text">
                        <strong>{m.displayName || m.username || m.Username}</strong>
                        <small>{m.email || m.Email || ''}</small>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

function TaskTitleCell({ task, onOpenTask, onTitleChange, readOnly }) {
  const [local, setLocal] = useState(task.title)

  useEffect(() => setLocal(task.title), [task.title])

  return (
    <div className="workspace-task-title">
      <input
        className="workspace-cell-input workspace-task-input"
        value={local}
        readOnly={readOnly}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          if (!readOnly && local.trim() && local !== task.title) onTitleChange(task.id, local.trim())
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

function CustomCell({ column, taskId, value, onSave, readOnly }) {
  const [local, setLocal] = useState(value || '')

  useEffect(() => setLocal(value || ''), [value])

  const commit = () => {
    if (!readOnly) onSave(taskId, column.id, local)
  }

  if (readOnly) {
    return <span>{local || '—'}</span>
  }

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
        <option value="">(none)</option>
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
