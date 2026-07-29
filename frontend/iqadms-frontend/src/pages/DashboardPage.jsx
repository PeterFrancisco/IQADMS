import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import TaskWorkspaceBoard from '../components/TaskWorkspaceBoard'
import AppModal, { ConfirmDialog } from '../components/AppModal'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import { getApiOrigin } from '../utils/apiOrigin'

const STATUS_OPTIONS = ['To Do', 'In Progress', 'Submitted', 'Completed', 'Cancelled']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical']
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

export default function DashboardPage() {
  const [searchParams] = useSearchParams()
  const filterProjectId = searchParams.get('project') || ''
  const filterDepartmentId = searchParams.get('department') || ''
  const filterTaskId = searchParams.get('task') || ''

  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assignedToUserId: '',
    projectId: '',
    relatedDepartmentId: '',
    dueDate: '',
    priority: 'Medium',
    status: 'To Do',
    uploadGoogleDriveLink: '',
    attachment: null
  })
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskComments, setTaskComments] = useState([])
  const [taskActivity, setTaskActivity] = useState([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [deliverableLink, setDeliverableLink] = useState('')
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false)
  const [boardColumns, setBoardColumns] = useState([])
  const [cellValues, setCellValues] = useState({})
  const [showAddColumnModal, setShowAddColumnModal] = useState(false)
  const [deleteColumnPrompt, setDeleteColumnPrompt] = useState(null)
  const [insertAfterColumnId, setInsertAfterColumnId] = useState(null)
  const [sortConfig, setSortConfig] = useState(null)
  const [newColumnForm, setNewColumnForm] = useState({ name: '', columnType: 'text', optionsText: '', binding: '' })

  const currentUserId = localStorage.getItem('userId')
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  const [adminReturnRemark, setAdminReturnRemark] = useState('')
  const [adminCompleteRemark, setAdminCompleteRemark] = useState('')
  const [taskActionLoading, setTaskActionLoading] = useState(false)
  const [memberAttachment, setMemberAttachment] = useState(null)

  const openedTaskLinkRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [filterProjectId, filterDepartmentId])

  useEffect(() => {
    if (!filterTaskId || loading) return
    if (openedTaskLinkRef.current === filterTaskId) return

    let cancelled = false

    async function openFromLink() {
      const found = tasks.find(t => t.id === filterTaskId)
      try {
        const task = found || (await api.get(`/Tasks/${filterTaskId}`)).data
        if (!cancelled) {
          openedTaskLinkRef.current = filterTaskId
          await openTaskDetail(task)
        }
      } catch (err) {
        console.error(err)
      }
    }

    openFromLink()
    return () => {
      cancelled = true
    }
  }, [filterTaskId, loading, tasks])

  async function loadData() {
    try {
      setLoading(true)
      const taskUrl = '/Tasks'
      const taskParams = {}
      if (filterProjectId) taskParams.projectId = filterProjectId
      if (filterDepartmentId) taskParams.relatedDepartmentId = filterDepartmentId
      const [tasksRes, membersRes, columnsRes, valuesRes, projectsRes, deptRes] = await Promise.all([
        api.get(taskUrl, { params: taskParams }),
        api.get('/Profile/members'),
        api.get('/BoardColumns'),
        api.get('/BoardColumns/cell-values'),
        isAdmin ? api.get('/Projects') : Promise.resolve({ data: [] }),
        isAdmin ? api.get('/Departments') : Promise.resolve({ data: [] })
      ])
      setTasks(tasksRes.data)
      setMembers(membersRes.data)
      setProjects(projectsRes.data)
      setDepartments(deptRes.data)
      setBoardColumns(columnsRes.data)

      const map = {}
      valuesRes.data.forEach(cv => {
        map[`${cv.taskId}_${cv.columnId}`] = cv.value ?? ''
      })
      setCellValues(map)
    } catch (err) {
      console.error(err)
      if (err.response?.status !== 401) {
        alert(getApiErrorMessage(err, 'Failed to load My Tasks. Check your connection and try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const guidOrNull = value => (value && String(value).trim() ? value : null)

  const createTaskWithDetails = async () => {
    if (!createForm.title.trim() || saving) return

    try {
      setSaving(true)

      const res = await api.post('/Tasks', {
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        assignedToUserId: guidOrNull(createForm.assignedToUserId),
        projectId: guidOrNull(createForm.projectId),
        relatedDepartmentId: guidOrNull(createForm.relatedDepartmentId),
        dueDate: createForm.dueDate || null,
        priority: createForm.priority,
        status: createForm.status,
        uploadGoogleDriveLink: createForm.uploadGoogleDriveLink || null
      })

      if (createForm.attachment) {
        const formData = new FormData()
        formData.append('file', createForm.attachment)
        try {
          await api.post(`/Tasks/${res.data.id}/attachment`, formData)
        } catch (attachErr) {
          console.error(attachErr)
          alert(
            getApiErrorMessage(
              attachErr,
              'Task was created, but the attachment could not be uploaded.'
            )
          )
        }
      }

      setCreateForm({
        title: '',
        description: '',
        assignedToUserId: '',
        projectId: filterProjectId || '',
        relatedDepartmentId: filterDepartmentId || '',
        dueDate: '',
        priority: 'Medium',
        status: 'To Do',
        uploadGoogleDriveLink: '',
        attachment: null
      })
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      console.error(err)
      if (err.response?.status === 401) {
        alert('Your session expired or is invalid. You will be redirected to sign in again.')
      } else {
        alert(getApiErrorMessage(err, 'Failed to create task.'))
      }
    } finally {
      setSaving(false)
    }
  }

  const getSortValue = (task, col) => {
    const b = col.binding
    if (b === 'task') return (task.title || '').toLowerCase()
    if (b === 'owner') return (task.assignedToName || '').toLowerCase()
    if (b === 'status') return (task.status || '').toLowerCase()
    if (b === 'due_date') return task.dueDate || ''
    return (cellValues[`${task.id}_${col.id}`] || '').toLowerCase()
  }

  const sortedTasks = useMemo(() => {
    if (!sortConfig) return tasks
    const col = boardColumns.find(c => c.id === sortConfig.columnId)
    if (!col) return tasks
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    return [...tasks].sort((a, b) => {
      const va = getSortValue(a, col)
      const vb = getSortValue(b, col)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [tasks, sortConfig, boardColumns, cellValues])

  const renameColumn = async (id, name) => {
    try {
      const res = await api.put(`/BoardColumns/${id}`, { name })
      setBoardColumns(prev => prev.map(c => (c.id === id ? { ...c, ...res.data } : c)))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to rename column.')
    }
  }

  const toggleWrapColumn = async (id, wrapText) => {
    try {
      const res = await api.put(`/BoardColumns/${id}`, { wrapText })
      setBoardColumns(prev => prev.map(c => (c.id === id ? { ...c, ...res.data } : c)))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update column.')
    }
  }

  const openAddColumn = afterId => {
    setInsertAfterColumnId(afterId)
    setShowAddColumnModal(true)
  }

  const getCellValue = (taskId, columnId) =>
    cellValues[`${taskId}_${columnId}`] ?? ''

  const saveCellValue = async (taskId, columnId, value) => {
    const key = `${taskId}_${columnId}`
    setCellValues(prev => ({ ...prev, [key]: value }))

    try {
      await api.put('/BoardColumns/cell-values', { taskId, columnId, value })
    } catch (err) {
      console.error(err)
      alert('Failed to save cell value.')
      loadData()
    }
  }

  const deleteColumn = (columnId, columnName) => {
    setDeleteColumnPrompt({ columnId, columnName })
  }

  const confirmDeleteColumn = async () => {
    if (!deleteColumnPrompt) return
    const { columnId, columnName } = deleteColumnPrompt

    try {
      await api.delete(`/BoardColumns/${columnId}`)
      setDeleteColumnPrompt(null)
      loadData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || `Failed to delete column "${columnName}".`)
    }
  }
  
  const createColumn = async () => {
    if (!newColumnForm.name.trim()) return

    try {
      const payload = {
        name: newColumnForm.name.trim(),
        columnType: newColumnForm.columnType,
        insertAfterColumnId: insertAfterColumnId || undefined
      }
      if (newColumnForm.binding) payload.binding = newColumnForm.binding
      if (newColumnForm.columnType === 'dropdown') {
        payload.options = newColumnForm.optionsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      }

      await api.post('/BoardColumns', payload)

      setNewColumnForm({ name: '', columnType: 'text', optionsText: '', binding: '' })
      setInsertAfterColumnId(null)
      setShowAddColumnModal(false)
      loadData()

    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to add column.')
    }
  }

  const updateStatus = async (id, status) => {
    try {
      const res = await api.put(`/Tasks/${id}`, { status })
      setTasks(prev => prev.map(t => (t.id === id ? res.data : t)))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to update status.')
    }
  }

  const openTaskDetail = async (task) => {
    setSelectedTask(task)
    setDeliverableLink(task.deliverableGoogleDriveLink || '')
    setAdminReturnRemark('')
    setAdminCompleteRemark('')
    setMemberAttachment(null)
    setNewComment('')
    setTaskComments([])
    setTaskActivity([])
    try {
      const [cRes, aRes] = await Promise.all([
        api.get(`/Tasks/${task.id}/comments`),
        api.get(`/Tasks/${task.id}/activity`)
      ])
      setTaskComments(cRes.data)
      setTaskActivity(aRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  const deleteTask = async task => {
    if (!isAdmin || !window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/Tasks/${task.id}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task.')
    }
  }

  const returnTaskToMember = async () => {
    if (!selectedTask || !adminReturnRemark.trim()) return
    try {
      setTaskActionLoading(true)
      await api.post(`/Tasks/${selectedTask.id}/return`, { remark: adminReturnRemark.trim() })
      closeTaskDetail()
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to return task.')
    } finally {
      setTaskActionLoading(false)
    }
  }

  const completeTask = async () => {
    if (!selectedTask) return
    try {
      setTaskActionLoading(true)
      await api.post(`/Tasks/${selectedTask.id}/complete`, {
        remark: adminCompleteRemark.trim() || null
      })
      closeTaskDetail()
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete task.')
    } finally {
      setTaskActionLoading(false)
    }
  }

  const uploadMemberAttachment = async () => {
    if (!selectedTask || !memberAttachment) return
    try {
      const formData = new FormData()
      formData.append('file', memberAttachment)
      await api.post(`/Tasks/${selectedTask.id}/attachment`, formData)
      setMemberAttachment(null)
      const refreshed = (await api.get(`/Tasks/${selectedTask.id}`)).data
      setSelectedTask(refreshed)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload attachment.')
    }
  }

  const closeTaskDetail = () => {
    setSelectedTask(null)
    setDeliverableLink('')
  }

  const submitDeliverable = async () => {
    if (!selectedTask || !deliverableLink.trim() || submittingDeliverable) return

    try {
      setSubmittingDeliverable(true)
      const res = await api.put(`/Tasks/${selectedTask.id}/deliverable`, {
        deliverableGoogleDriveLink: deliverableLink.trim()
      })
      setSelectedTask(res.data)
      setTasks(prev => prev.map(t => (t.id === selectedTask.id ? res.data : t)))
      closeTaskDetail()
      loadData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to submit deliverable.')
    } finally {
      setSubmittingDeliverable(false)
    }
  }

  const assignMember = async (id, userId) => {
    try {
      const res = await api.put(`/Tasks/${id}`, {
        setAssignee: true,
        assignedToUserId: userId || null
      })
      setTasks(prev => prev.map(t => (t.id === id ? res.data : t)))
    } catch (err) {
      console.error(err)
      alert('Failed to assign member.')
    }
  }

  const patchTask = async (id, body) => {
    try {
      const res = await api.put(`/Tasks/${id}`, body)
      setTasks(prev => prev.map(t => (t.id === id ? res.data : t)))
      if (selectedTask?.id === id) setSelectedTask(res.data)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to update task.')
    }
  }

  const updateProjectLink = (id, projectId) =>
    patchTask(id, { setProject: true, projectId: projectId || null })

  const updateRelatedDept = (id, relatedDepartmentId) =>
    patchTask(id, { setRelatedDepartment: true, relatedDepartmentId: relatedDepartmentId || null })

  const updateDueDate = (id, dueDate) =>
    patchTask(id, { setDueDate: true, dueDate: dueDate || null })

  const updatePriority = (id, priority) => patchTask(id, { priority })

  const updateTitle = (id, title) => patchTask(id, { title })

  const postComment = async () => {
    if (!selectedTask || !newComment.trim() || postingComment) return
    try {
      setPostingComment(true)
      const res = await api.post(`/Tasks/${selectedTask.id}/comments`, { body: newComment.trim() })
      setTaskComments(prev => [...prev, res.data])
      setNewComment('')
      loadData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to post comment.')
    } finally {
      setPostingComment(false)
    }
  }

  const filterProject = projects.find(p => p.id === filterProjectId)
  const filterDepartment = departments.find(d => d.id === filterDepartmentId)

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ marginBottom: '.25rem', color: '#7a0019' }}>My Tasks</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Flexible workspace: rename columns from the header menu (⋮), scroll horizontally, sort, and add columns to the right.
          {filterProject && (
            <span style={{ display: 'block', marginTop: '0.35rem', fontWeight: 600, color: '#7a0019' }}>
              Filter: project · {filterProject.title}
            </span>
          )}
          {filterDepartment && (
            <span style={{ display: 'block', marginTop: '0.35rem', fontWeight: 600, color: '#7a0019' }}>
              Filter: department · {filterDepartment.name}
            </span>
          )}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {isAdmin && (
            <MiniStat label="Total Tasks" value={tasks.length} color="#9e1b32" />
          )}
          <MiniStat label="To Do" value={tasks.filter(t => t.status === 'To Do' || t.status === 'Planning').length} color="#7a0019" />
          <MiniStat label="In Progress" value={tasks.filter(t => t.status === 'In Progress').length} color="#f59e0b" />
          <MiniStat label="Submitted" value={tasks.filter(t => t.status === 'Submitted').length} color="#2563eb" />
          {isAdmin && (
            <MiniStat label="Completed" value={tasks.filter(t => isCompletedStatus(t.status)).length} color="#16a34a" />
          )}
        </div>

        <TaskWorkspaceBoard
          columns={boardColumns}
          tasks={sortedTasks}
          members={members}
          loading={loading}
          sortConfig={sortConfig}
          onSort={(columnId, direction) => setSortConfig({ columnId, direction })}
          onRenameColumn={isAdmin ? renameColumn : undefined}
          onToggleWrap={isAdmin ? toggleWrapColumn : undefined}
          onDeleteColumn={isAdmin ? deleteColumn : undefined}
          onAddColumnRight={isAdmin ? openAddColumn : undefined}
          onCreateTask={isAdmin ? () => setShowCreateModal(true) : undefined}
          onOpenTask={openTaskDetail}
          onAssign={isAdmin ? assignMember : undefined}
          onStatus={updateStatus}
          onDueDate={isAdmin ? updateDueDate : undefined}
          onTitleChange={isAdmin ? updateTitle : undefined}
          getCellValue={getCellValue}
          saveCellValue={isAdmin ? saveCellValue : undefined}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onDeleteTask={isAdmin ? deleteTask : undefined}
        />

        <ConfirmDialog
          open={Boolean(deleteColumnPrompt)}
          onClose={() => setDeleteColumnPrompt(null)}
          onConfirm={confirmDeleteColumn}
          title="Delete column"
          message={
            deleteColumnPrompt
              ? `Delete "${deleteColumnPrompt.columnName}"? This cannot be undone.`
              : ''
          }
          confirmLabel="Delete"
          danger
        />

        <AppModal
          open={Boolean(selectedTask)}
          onClose={closeTaskDetail}
          title={selectedTask?.title || 'Task'}
          size="lg"
        >
          {selectedTask && (
            <>
              <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                Status: <strong style={{ color: statusColor(selectedTask.status) }}>{selectedTask.status}</strong>
                {selectedTask.priority && <> · Priority: {selectedTask.priority}</>}
                {selectedTask.dueDate && <> · Due {selectedTask.dueDate}</>}
                {selectedTask.projectTitle && <> · {selectedTask.projectTitle}</>}
                {selectedTask.relatedDepartmentName && <> · Dept: {selectedTask.relatedDepartmentName}</>}
                {selectedTask.assignedToName && <> · Assigned to {selectedTask.assignedToName}</>}
              </p>

              {selectedTask.description && (
                <>
                  <label style={labelStyle}>Description</label>
                  <p style={{ margin: '0 0 1rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                    {selectedTask.description}
                  </p>
                </>
              )}

              {selectedTask.attachmentFileName && (
                <>
                  <label style={labelStyle}>Reference attachment</label>
                  <p style={{ margin: '0 0 1rem' }}>
                    <a
                      href={`${getApiOrigin()}${selectedTask.attachmentDownloadUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#9e1b32', fontWeight: 600 }}
                    >
                      Download {selectedTask.attachmentFileName}
                    </a>
                  </p>
                </>
              )}

              {selectedTask.uploadGoogleDriveLink && (
                <>
                  <label style={labelStyle}>Upload folder (Google Drive)</label>
                  <p style={{ margin: '0 0 1rem' }}>
                    <a
                      href={selectedTask.uploadGoogleDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#9e1b32', wordBreak: 'break-all' }}
                    >
                      Open Google Drive folder
                    </a>
                  </p>
                </>
              )}

              {selectedTask.deliverableGoogleDriveLink && (
                <>
                  <label style={labelStyle}>Submitted work</label>
                  <p style={{ margin: '0 0 1rem' }}>
                    <a
                      href={selectedTask.deliverableGoogleDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', wordBreak: 'break-all' }}
                    >
                      View finished work on Google Drive
                    </a>
                  </p>
                </>
              )}

              {selectedTask.adminReviewRemark && (
                <>
                  <label style={labelStyle}>Admin remark</label>
                  <p style={{ margin: '0 0 1rem', color: '#b45309', whiteSpace: 'pre-wrap' }}>
                    {selectedTask.adminReviewRemark}
                  </p>
                </>
              )}

              {(selectedTask.assignedToUserId === currentUserId || isAdmin) &&
                !isCompletedStatus(selectedTask.status) &&
                selectedTask.status !== 'Submitted' && (
                  <>
                    <label style={labelStyle}>Upload supporting document</label>
                    <input
                      type="file"
                      style={{ marginBottom: '0.5rem', display: 'block' }}
                      onChange={e => setMemberAttachment(e.target.files?.[0] || null)}
                    />
                    {memberAttachment && (
                      <button type="button" onClick={uploadMemberAttachment} style={{ ...primaryBtn, marginBottom: '1rem' }}>
                        Upload file
                      </button>
                    )}
                  </>
                )}

              {selectedTask.assignedToUserId === currentUserId &&
                selectedTask.status === 'In Progress' && (
                  <>
                    <label style={labelStyle}>Your finished work (Google Drive link)</label>
                    <input
                      style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
                      placeholder="https://drive.google.com/..."
                      value={deliverableLink}
                      onChange={e => setDeliverableLink(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={submitDeliverable}
                      disabled={submittingDeliverable || !deliverableLink.trim()}
                      style={primaryBtn}
                    >
                      {submittingDeliverable ? 'Submitting...' : 'Submit for admin review'}
                    </button>
                  </>
                )}

              {isAdmin && selectedTask.status === 'Submitted' && (
                <>
                  <label style={labelStyle}>Approval remark (optional)</label>
                  <textarea
                    style={{ ...inputStyle, width: '100%', minHeight: 64, marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    placeholder="Optional note when approving…"
                    value={adminCompleteRemark}
                    onChange={e => setAdminCompleteRemark(e.target.value)}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <button
                      type="button"
                      onClick={completeTask}
                      disabled={taskActionLoading}
                      style={{ ...primaryBtn, background: '#16a34a' }}
                    >
                      Approve & mark completed
                    </button>
                  </div>
                  <label style={labelStyle}>Return for revision</label>
                  <textarea
                    style={{ ...inputStyle, width: '100%', minHeight: 64, marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    placeholder="Explain what needs to be fixed…"
                    value={adminReturnRemark}
                    onChange={e => setAdminReturnRemark(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={returnTaskToMember}
                    disabled={taskActionLoading || !adminReturnRemark.trim()}
                    style={{ ...primaryBtn, background: '#b45309', marginBottom: '1rem' }}
                  >
                    Return to assignee
                  </button>
                </>
              )}

              <label style={{ ...labelStyle, marginTop: '1.25rem' }}>Comments</label>
              <div style={{ maxHeight: 160, overflow: 'auto', marginBottom: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
                {taskComments.length === 0 ? (
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>No comments yet.</p>
                ) : (
                  taskComments.map(c => (
                    <div key={c.id} style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                      <strong style={{ color: '#7a0019' }}>{c.authorName}</strong>
                      <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: '0.8rem' }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                      <div style={{ color: '#334155', marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                    </div>
                  ))
                )}
              </div>
              <textarea
                style={{ ...inputStyle, width: '100%', minHeight: 72, marginBottom: '0.5rem', boxSizing: 'border-box' }}
                placeholder="Add a comment…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button type="button" onClick={postComment} disabled={postingComment || !newComment.trim()} style={{ ...primaryBtn, marginBottom: '1rem' }}>
                {postingComment ? 'Posting…' : 'Post comment'}
              </button>

              {taskActivity.length > 0 && (
                <>
                  <label style={labelStyle}>Activity</label>
                  <ul style={{ margin: '0 0 1rem', paddingLeft: '1.1rem', color: '#475569', fontSize: '0.85rem' }}>
                    {taskActivity.slice(0, 8).map(a => (
                      <li key={a.id} style={{ marginBottom: 4 }}>
                        <strong>{a.action}</strong>
                        {a.detail ? `: ${a.detail}` : ''}
                        {a.actorName && ` (${a.actorName})`}
                        <span style={{ color: '#94a3b8' }}> · {new Date(a.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={closeTaskDetail} style={ghostBtn}>
                  Close
                </button>
              </div>
            </>
          )}
        </AppModal>

        <AppModal
          open={showAddColumnModal}
          onClose={() => setShowAddColumnModal(false)}
          title="Add column"
          size="sm"
          footer={
            <div className="app-modal-actions">
              <button type="button" onClick={() => setShowAddColumnModal(false)} style={ghostBtn}>
                Cancel
              </button>
              <button type="button" onClick={createColumn} style={primaryBtn}>
                Add column
              </button>
            </div>
          }
        >
          <label style={labelStyle}>Column name</label>
          <input
            style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
            placeholder="e.g. GDrive Submission"
            value={newColumnForm.name}
            onChange={e => setNewColumnForm({ ...newColumnForm, name: e.target.value })}
          />

          <label style={labelStyle}>Column type</label>
          <select
            style={{ ...selectStyle, marginBottom: '1rem' }}
            value={newColumnForm.columnType}
            onChange={e => setNewColumnForm({ ...newColumnForm, columnType: e.target.value, binding: '' })}
          >
            <option value="text">Text</option>
            <option value="link">Link</option>
            <option value="date">Date</option>
            <option value="number">Number</option>
            <option value="dropdown">Dropdown (limited choices)</option>
          </select>

          <label style={labelStyle}>Special column (optional)</label>
          <select
            style={{ ...selectStyle, marginBottom: '1rem' }}
            value={newColumnForm.binding}
            onChange={e => setNewColumnForm({ ...newColumnForm, binding: e.target.value })}
          >
            <option value="">Custom field</option>
            <option value="owner">Owner</option>
            <option value="status">Status</option>
            <option value="due_date">Due date</option>
          </select>

          {newColumnForm.columnType === 'dropdown' && (
            <>
              <label style={labelStyle}>Options (comma-separated)</label>
              <input
                style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
                placeholder="e.g. High, Medium, Low"
                value={newColumnForm.optionsText}
                onChange={e => setNewColumnForm({ ...newColumnForm, optionsText: e.target.value })}
              />
            </>
          )}
        </AppModal>

        <AppModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create task"
          size="md"
          footer={
            <div className="app-modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)} style={ghostBtn}>
                Cancel
              </button>
              <button type="button" onClick={createTaskWithDetails} disabled={saving} style={primaryBtn}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          }
        >
          <label style={labelStyle}>Task name</label>
          <input
            style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
            placeholder="Enter task name..."
            value={createForm.title}
            onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
          />

          <label style={labelStyle}>Description (optional)</label>
          <textarea
            style={{ ...inputStyle, width: '100%', minHeight: 56, maxHeight: 120, marginBottom: '1rem', boxSizing: 'border-box', resize: 'vertical' }}
            value={createForm.description}
            onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
          />

          <label style={labelStyle}>Project</label>
          <select
            style={{ ...selectStyle, marginBottom: '1rem' }}
            value={createForm.projectId}
            onChange={e => setCreateForm({ ...createForm, projectId: e.target.value })}
          >
            <option value="">None</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <label style={labelStyle}>Related department (metadata)</label>
          <select
            style={{ ...selectStyle, marginBottom: '1rem' }}
            value={createForm.relatedDepartmentId}
            onChange={e => setCreateForm({ ...createForm, relatedDepartmentId: e.target.value })}
          >
            <option value="">None</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <div className="mobile-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Due date</label>
              <input
                type="date"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                value={createForm.dueDate}
                onChange={e => setCreateForm({ ...createForm, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select
                style={{ ...selectStyle, width: '100%' }}
                value={createForm.priority}
                onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <label style={labelStyle}>Assign to</label>
          <select
            style={{ ...selectStyle, marginBottom: '1rem' }}
            value={createForm.assignedToUserId}
            onChange={e => setCreateForm({ ...createForm, assignedToUserId: e.target.value })}
          >
            <option value="">Assign to me</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.displayName || m.username} ({m.email})
              </option>
            ))}
          </select>

          <label style={labelStyle}>Google Drive link (where assignee uploads finished work)</label>
          <input
            style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
            placeholder="https://drive.google.com/..."
            value={createForm.uploadGoogleDriveLink}
            onChange={e => setCreateForm({ ...createForm, uploadGoogleDriveLink: e.target.value })}
          />

          <label style={labelStyle}>Reference attachment (optional)</label>
          <input
            type="file"
            style={{ marginBottom: '0.25rem', display: 'block' }}
            onChange={e => setCreateForm({ ...createForm, attachment: e.target.files[0] })}
          />
        </AppModal>
      </div>
    </DashboardLayout>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)', borderLeft: `4px solid ${color}` }}>
      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

const inputStyle = { flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem' }
const selectStyle = { width: '100%', padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: '#9e1b32', color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const labelStyle = { display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }