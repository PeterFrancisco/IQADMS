import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import TaskWorkspaceBoard from '../components/TaskWorkspaceBoard'
import TasksAdminToolbar from '../components/TasksAdminToolbar'
import TasksMemberToolbar from '../components/TasksMemberToolbar'
import ProjectTaskBoardCard from '../components/ProjectTaskBoardCard'
import AppModal, { ConfirmDialog } from '../components/AppModal'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/apiError'
import { getApiOrigin } from '../utils/apiOrigin'
import AppIcon from '../components/AppIcon'
import '../theme/tasks-page.css'
import { appDialog } from '../utils/appDialog'
import { notifyTaskEmailFromResponse, explainNoAssigneeEmail } from '../utils/taskEmailFeedback'
import {
  NO_PROJECT_SECTION,
  buildTaskBoardLink,
  effectiveTaskSectionId
} from '../utils/notificationLink'
import { dispatchNotificationsChanged, dispatchTasksChanged } from '../utils/appEvents'

const TASK_POLL_MS = 10000


const STATUS_OPTIONS = ['To Do', 'In Progress', 'Submitted', 'Returned', 'Completed', 'Cancelled']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical']
const STATUS_COLORS = {
  'To Do': '#7a0019',
  Planning: '#7a0019',
  'In Progress': '#f59e0b',
  Submitted: '#2563eb',
  Returned: '#c2410c',
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

function taskAssigneeId(task) {
  return task?.assignedToUserId ?? task?.AssignedToUserId ?? ''
}

function taskReferenceDownloads(task) {
  const items = []
  const seen = new Set()
  for (const a of task.attachments || []) {
    const url = `${getApiOrigin()}${a.downloadUrl}`
    const key = url
    if (!seen.has(key)) {
      seen.add(key)
      items.push({ fileName: a.fileName, url })
    }
  }
  if (task.attachmentFileName && task.attachmentDownloadUrl) {
    const url = `${getApiOrigin()}${task.attachmentDownloadUrl}`
    if (!seen.has(url)) {
      items.push({ fileName: task.attachmentFileName, url })
    }
  }
  return items
}

function isTaskAssignee(task, userId) {
  if (!task || !userId) return false
  const a = String(taskAssigneeId(task)).trim().toLowerCase()
  const b = String(userId).trim().toLowerCase()
  return a.length > 0 && a === b
}

function taskProjectId(task) {
  return task?.projectId ?? task?.ProjectId ?? ''
}

function taskRelatedDepartmentId(task) {
  return task?.relatedDepartmentId ?? task?.RelatedDepartmentId ?? ''
}

function applyAdminTaskFilters(tasks, { search, status, assignee, department, project, activeProjectIds }) {
  let list = tasks
  const q = search.trim().toLowerCase()
  if (q) list = list.filter(t => (t.title || '').toLowerCase().includes(q))
  if (status !== 'all') list = list.filter(t => t.status === status)
  if (assignee) list = list.filter(t => String(taskAssigneeId(t)) === assignee)
  if (department) list = list.filter(t => String(taskRelatedDepartmentId(t)) === department)
  if (project) list = list.filter(t => effectiveTaskSectionId(t, activeProjectIds) === project)
  return list
}

function sortProjectSections(sections, sortKey) {
  const copy = [...sections]
  const progress = s => {
    const total = s.tasks.length
    if (total === 0) return 0
    const done = s.tasks.filter(
      t => t.status === 'Submitted' || t.status === 'Completed' || t.status === 'Done'
    ).length
    return Math.round((done / total) * 100)
  }
  copy.sort((a, b) => {
    switch (sortKey) {
      case 'title-desc':
        return b.title.localeCompare(a.title)
      case 'progress-desc':
        return progress(b) - progress(a)
      case 'progress-asc':
        return progress(a) - progress(b)
      case 'tasks-desc':
        return b.tasks.length - a.tasks.length
      case 'tasks-asc':
        return a.tasks.length - b.tasks.length
      default:
        return a.title.localeCompare(b.title)
    }
  })
  return copy
}

export default function DashboardPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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

  const [adminSearch, setAdminSearch] = useState('')
  const [adminStatusFilter, setAdminStatusFilter] = useState('all')
  const [adminAssigneeFilter, setAdminAssigneeFilter] = useState('')
  const [adminToolbarProject, setAdminToolbarProject] = useState('')
  const [adminSortKey, setAdminSortKey] = useState('title-asc')

  const [memberSearch, setMemberSearch] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState('all')
  const [memberToolbarProject, setMemberToolbarProject] = useState('')
  const [memberSortKey, setMemberSortKey] = useState('title-asc')

  const openedTaskLinkRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [filterProjectId, filterDepartmentId])

  useEffect(() => {
    const onTasksChanged = () => loadData(true)
    window.addEventListener('iqadms-tasks-changed', onTasksChanged)
    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadData(true)
    }, TASK_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('iqadms-tasks-changed', onTasksChanged)
      window.clearInterval(pollId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [filterProjectId, filterDepartmentId])

  useEffect(() => {
    if (!filterTaskId || loading) return
    if (openedTaskLinkRef.current === filterTaskId) return

    let cancelled = false

    async function openFromLink() {
      const found = tasks.find(t => t.id === filterTaskId)
      try {
        const task = found || (await api.get(`/Tasks/${filterTaskId}`)).data
        if (cancelled) return

        const activeIds = new Set(projects.map(p => String(p.id)))
        const sectionId = effectiveTaskSectionId(task, activeIds)
        if (!filterProjectId) {
          navigate(buildTaskBoardLink(task.id, sectionId === NO_PROJECT_SECTION ? null : sectionId), {
            replace: true
          })
        }

        openedTaskLinkRef.current = filterTaskId
        await openTaskDetail(task)
      } catch (err) {
        console.error(err)
      }
    }

    openFromLink()
    return () => {
      cancelled = true
    }
  }, [filterTaskId, filterProjectId, loading, tasks, projects, navigate])

  function refreshAfterMutation() {
    dispatchTasksChanged()
    dispatchNotificationsChanged()
  }

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true)
      const taskUrl = '/Tasks'
      const taskParams = {}
      if (filterProjectId && filterProjectId !== NO_PROJECT_SECTION) {
        taskParams.projectId = filterProjectId
      }
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
        await appDialog.alert(getApiErrorMessage(err, 'Failed to load My Tasks. Check your connection and try again.'))
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const activeProjectIds = useMemo(
    () => new Set(projects.map(p => String(p.id))),
    [projects]
  )

  const guidOrNull = value => (value && String(value).trim() ? value : null)

  const createTaskWithDetails = async () => {
    if (!createForm.title.trim() || saving) return
    if (!createForm.projectId?.trim()) {
      await appDialog.alert('Choose a project for this task. Tasks are tracked per project.')
      return
    }

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

      const assignedToOther = Boolean(createForm.assignedToUserId?.trim())

      if (createForm.attachment) {
        const formData = new FormData()
        formData.append('file', createForm.attachment)
        try {
          await api.post(`/Tasks/${res.data.id}/attachment`, formData)
        } catch (attachErr) {
          console.error(attachErr)
          await appDialog.alert(
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
      refreshAfterMutation()

      const hadAssignee = assignedToOther
      if (res.headers?.['x-iqadms-task-email-error'] || res.headers?.['x-iqadms-task-email-to']) {
        await notifyTaskEmailFromResponse(res, 'Task created.')
      } else if (isAdmin && !hadAssignee) {
        await appDialog.alert(`Task created.\n\n${explainNoAssigneeEmail()}`)
      }
    } catch (err) {
      console.error(err)
      if (err.response?.status === 401) {
        await appDialog.alert('Your session expired or is invalid. You will be redirected to sign in again.')
      } else {
        await appDialog.alert(getApiErrorMessage(err, 'Failed to create task.'))
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

  const sortTasksList = taskList => {
    if (!sortConfig) return taskList
    const col = boardColumns.find(c => c.id === sortConfig.columnId)
    if (!col) return taskList
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    return [...taskList].sort((a, b) => {
      const va = getSortValue(a, col)
      const vb = getSortValue(b, col)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }

  const adminFilteredTasks = useMemo(() => {
    if (!isAdmin) return tasks
    return applyAdminTaskFilters(tasks, {
      search: adminSearch,
      status: adminStatusFilter,
      assignee: adminAssigneeFilter,
      department: filterDepartmentId,
      project: adminToolbarProject,
      activeProjectIds
    })
  }, [
    tasks,
    isAdmin,
    adminSearch,
    adminStatusFilter,
    adminAssigneeFilter,
    filterDepartmentId,
    adminToolbarProject,
    activeProjectIds
  ])

  const adminProjectSections = useMemo(() => {
    if (!isAdmin) return []
    let sections = projects.map(p => ({
      id: p.id,
      title: p.title,
      status: p.status,
      priority: p.priority,
      tasks: adminFilteredTasks.filter(
        t => effectiveTaskSectionId(t, activeProjectIds) === String(p.id)
      )
    }))
    const unassigned = adminFilteredTasks.filter(
      t => effectiveTaskSectionId(t, activeProjectIds) === NO_PROJECT_SECTION
    )
    if (unassigned.length || adminToolbarProject === NO_PROJECT_SECTION) {
      sections.push({
        id: NO_PROJECT_SECTION,
        title: 'No project',
        status: null,
        priority: null,
        tasks: unassigned
      })
    }
    if (adminToolbarProject) {
      sections = sections.filter(s => s.id === adminToolbarProject)
    }
    return sortProjectSections(sections, adminSortKey)
  }, [isAdmin, projects, adminFilteredTasks, adminToolbarProject, adminSortKey, activeProjectIds])

  const memberProjects = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      const id = taskProjectId(t)
      if (!id) continue
      if (!map.has(id)) {
        map.set(id, {
          id,
          title: t.projectTitle || t.ProjectTitle || 'Project'
        })
      }
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title))
  }, [tasks])

  const memberActiveProjectIds = useMemo(
    () => new Set(memberProjects.map(p => String(p.id))),
    [memberProjects]
  )

  const memberFilteredTasks = useMemo(() => {
    if (isAdmin) return tasks
    return applyAdminTaskFilters(tasks, {
      search: memberSearch,
      status: memberStatusFilter,
      assignee: '',
      department: '',
      project: memberToolbarProject,
      activeProjectIds: memberActiveProjectIds
    })
  }, [tasks, isAdmin, memberSearch, memberStatusFilter, memberToolbarProject, memberActiveProjectIds])

  const memberProjectSections = useMemo(() => {
    if (isAdmin) return []
    let sections = memberProjects.map(p => ({
      id: p.id,
      title: p.title,
      status: null,
      priority: null,
      tasks: memberFilteredTasks.filter(
        t => effectiveTaskSectionId(t, memberActiveProjectIds) === String(p.id)
      )
    }))
    const unassigned = memberFilteredTasks.filter(
      t => effectiveTaskSectionId(t, memberActiveProjectIds) === NO_PROJECT_SECTION
    )
    if (unassigned.length || memberToolbarProject === NO_PROJECT_SECTION) {
      sections.push({
        id: NO_PROJECT_SECTION,
        title: 'No project',
        status: null,
        priority: null,
        tasks: unassigned
      })
    }
    if (memberToolbarProject) {
      sections = sections.filter(s => s.id === memberToolbarProject)
    }
    return sortProjectSections(sections, memberSortKey)
  }, [isAdmin, memberProjects, memberFilteredTasks, memberToolbarProject, memberSortKey, memberActiveProjectIds])

  const adminFocusSortedTasks = useMemo(() => {
    if (!isAdmin || !filterProjectId) return sortedTasks
    if (filterProjectId === NO_PROJECT_SECTION) {
      return sortTasksList(
        adminFilteredTasks.filter(
          t => effectiveTaskSectionId(t, activeProjectIds) === NO_PROJECT_SECTION
        )
      )
    }
    return sortTasksList(
      adminFilteredTasks.filter(t => String(taskProjectId(t)) === filterProjectId)
    )
  }, [isAdmin, filterProjectId, sortedTasks, adminFilteredTasks, sortConfig, boardColumns, cellValues, activeProjectIds])

  const memberFocusSortedTasks = useMemo(() => {
    if (isAdmin || !filterProjectId) return sortedTasks
    if (filterProjectId === NO_PROJECT_SECTION) {
      return sortTasksList(
        memberFilteredTasks.filter(
          t => effectiveTaskSectionId(t, memberActiveProjectIds) === NO_PROJECT_SECTION
        )
      )
    }
    return sortTasksList(
      memberFilteredTasks.filter(t => String(taskProjectId(t)) === filterProjectId)
    )
  }, [isAdmin, filterProjectId, sortedTasks, memberFilteredTasks, sortConfig, boardColumns, cellValues, memberActiveProjectIds])

  const openCreateForProject = projectId => {
    setCreateForm(prev => ({
      ...prev,
      projectId: projectId || filterProjectId || prev.projectId
    }))
    setShowCreateModal(true)
  }

  const clearAdminFilters = () => {
    setAdminSearch('')
    setAdminStatusFilter('all')
    setAdminAssigneeFilter('')
    setAdminToolbarProject('')
    setAdminSortKey('title-asc')
  }

  const clearMemberFilters = () => {
    setMemberSearch('')
    setMemberStatusFilter('all')
    setMemberToolbarProject('')
    setMemberSortKey('title-asc')
  }

  const renderTaskBoard = (taskList, createProjectId) => (
    <TaskWorkspaceBoard
      columns={boardColumns}
      tasks={sortTasksList(taskList)}
      members={members}
      loading={loading}
      sortConfig={sortConfig}
      onSort={(columnId, direction) => setSortConfig({ columnId, direction })}
      onRenameColumn={isAdmin ? renameColumn : undefined}
      onToggleWrap={isAdmin ? toggleWrapColumn : undefined}
      onDeleteColumn={isAdmin ? deleteColumn : undefined}
      onAddColumnRight={isAdmin ? openAddColumn : undefined}
      onCreateTask={
        isAdmin && createProjectId ? () => openCreateForProject(createProjectId) : isAdmin ? () => openCreateForProject('') : undefined
      }
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
  )

  const renameColumn = async (id, name) => {
    try {
      const res = await api.put(`/BoardColumns/${id}`, { name })
      setBoardColumns(prev => prev.map(c => (c.id === id ? { ...c, ...res.data } : c)))
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to rename column.')
    }
  }

  const toggleWrapColumn = async (id, wrapText) => {
    try {
      const res = await api.put(`/BoardColumns/${id}`, { wrapText })
      setBoardColumns(prev => prev.map(c => (c.id === id ? { ...c, ...res.data } : c)))
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to update column.')
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
      await appDialog.alert('Failed to save cell value.')
      refreshAfterMutation()
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
      refreshAfterMutation()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || `Failed to delete column "${columnName}".`)
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
      refreshAfterMutation()

    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to add column.')
    }
  }

  const updateStatus = async (id, status) => {
    const task = tasks.find(t => t.id === id)
    try {
      const res = await api.put(`/Tasks/${id}`, { status })
      setTasks(prev => prev.map(t => (t.id === id ? res.data : t)))
      if (selectedTask?.id === id) {
        setSelectedTask(res.data)
      }
      refreshAfterMutation()
    } catch (err) {
      console.error(err)
      const apiMsg = err.response?.data?.message
      if (!isAdmin && task?.status === 'In Progress' && status === 'To Do') {
        await appDialog.alert({
          title: 'Cannot move back to To Do',
          message:
            'Once a task is In Progress, you cannot set it back to To Do.\n\nYou can: stay In Progress and submit finished work, or wait for admin review.\n\nYou cannot: revert to To Do or set Submitted/Completed/Cancelled yourself.'
        })
        return
      }
      await appDialog.alert({
        title: 'Status not updated',
        message:
          apiMsg ||
          'You can move tasks from To Do (or Returned) to In Progress, then submit your deliverable from the task panel. Other status changes are done by admins.'
      })
    }
  }

  const openTaskDetail = async (task) => {
    setDeliverableLink(task.deliverableGoogleDriveLink || '')
    setAdminReturnRemark('')
    setAdminCompleteRemark('')
    setMemberAttachment(null)
    setNewComment('')
    setTaskComments([])
    setTaskActivity([])
    try {
      const full = (await api.get(`/Tasks/${task.id}`)).data
      setSelectedTask(full)
      setDeliverableLink(full.deliverableGoogleDriveLink || '')
      const requests = [api.get(`/Tasks/${task.id}/activity`)]
      if (isAdmin) {
        requests.unshift(api.get(`/Tasks/${task.id}/comments`))
      }
      const results = await Promise.all(requests)
      if (isAdmin) {
        setTaskComments(results[0].data)
        setTaskActivity(results[1].data)
      } else {
        setTaskActivity(results[0].data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const deleteTask = async task => {
    if (
      !isAdmin ||
      !(await appDialog.confirm({
        title: 'Delete task',
        message: `Delete task "${task.title}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true
      }))
    )
      return
    try {
      await api.delete(`/Tasks/${task.id}`)
      dispatchTasksChanged()
      dispatchNotificationsChanged()
      await appDialog.alert(`Task "${task.title}" deleted.`)
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to delete task.')
    }
  }

  const clearNoProjectBoard = async (sectionTasks, title = 'No project') => {
    if (!isAdmin) return
    const list = sectionTasks || []
    if (list.length === 0) {
      await appDialog.alert('No tasks in this board.')
      return
    }
    const names = list.map(t => `"${t.title}"`).join(', ')
    if (
      !(await appDialog.confirm({
        title: 'Clear No project board',
        message: `Delete ${list.length} task(s) from ${title}? (${names})\n\nThis cannot be undone.`,
        confirmLabel: 'Delete all tasks',
        danger: true
      }))
    )
      return
    try {
      await Promise.all(list.map(t => api.delete(`/Tasks/${t.id}`)))
      if (filterProjectId === NO_PROJECT_SECTION) navigate('/my-tasks')
      refreshAfterMutation()
      await appDialog.alert('Board cleared.')
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to delete tasks.')
      refreshAfterMutation()
    }
  }

  const deleteProjectBoard = async (projectId, title, sectionTasks = []) => {
    if (!isAdmin) return
    if (projectId === NO_PROJECT_SECTION) {
      await clearNoProjectBoard(sectionTasks, title)
      return
    }
    if (
      !(await appDialog.confirm({
        title: 'Delete project',
        message: `Delete project "${title}"? Tasks in this board will move to No project.`,
        confirmLabel: 'Delete project',
        danger: true
      }))
    )
      return
    try {
      await api.delete(`/Projects/${projectId}`)
      dispatchTasksChanged()
      if (filterProjectId === projectId) navigate('/my-tasks')
      refreshAfterMutation()
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to delete project.')
    }
  }

  const returnTaskToMember = async () => {
    if (!selectedTask || !adminReturnRemark.trim()) return
    try {
      setTaskActionLoading(true)
      const res = await api.post(`/Tasks/${selectedTask.id}/return`, { remark: adminReturnRemark.trim() })
      setSelectedTask(res.data)
      refreshAfterMutation()
      closeTaskDetail()
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to return task.')
    } finally {
      setTaskActionLoading(false)
    }
  }

  const completeTask = async () => {
    if (!selectedTask) return
    try {
      setTaskActionLoading(true)
      const res = await api.post(`/Tasks/${selectedTask.id}/complete`, {
        remark: adminCompleteRemark.trim() || null
      })
      setSelectedTask(res.data)
      refreshAfterMutation()
      closeTaskDetail()
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to complete task.')
    } finally {
      setTaskActionLoading(false)
    }
  }

  const uploadMemberAttachment = async () => {
    if (!selectedTask || !memberAttachment) return
    try {
      const formData = new FormData()
      formData.append('file', memberAttachment)
      const uploadRes = await api.post(`/Tasks/${selectedTask.id}/attachment`, formData)
      setMemberAttachment(null)
      const refreshed = (await api.get(`/Tasks/${selectedTask.id}`)).data
      setSelectedTask(refreshed)
      refreshAfterMutation()
      if (
        uploadRes.headers?.['x-iqadms-task-email-error'] ||
        uploadRes.headers?.['x-iqadms-task-email-sent']
      ) {
        await notifyTaskEmailFromResponse(uploadRes, 'File uploaded.')
      }
    } catch (err) {
      await appDialog.alert(err.response?.data?.message || 'Failed to upload attachment.')
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
      if (
        res.headers?.['x-iqadms-task-email-error'] ||
        res.headers?.['x-iqadms-task-email-sent']
      ) {
        await notifyTaskEmailFromResponse(res, 'Deliverable submitted for review.')
      }
      closeTaskDetail()
      refreshAfterMutation()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to submit deliverable.')
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
      if (res.headers?.['x-iqadms-task-email-error'] || res.headers?.['x-iqadms-task-email-to']) {
        await notifyTaskEmailFromResponse(res, 'Assignee updated.')
      }
      setTasks(prev => prev.map(t => (t.id === id ? res.data : t)))
      refreshAfterMutation()
    } catch (err) {
      console.error(err)
      await appDialog.alert('Failed to assign member.')
    }
  }

  const patchTask = async (id, body) => {
    try {
      const res = await api.put(`/Tasks/${id}`, body)
      setTasks(prev => prev.map(t => (t.id === id ? res.data : t)))
      if (selectedTask?.id === id) setSelectedTask(res.data)
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to update task.')
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
      refreshAfterMutation()
    } catch (err) {
      console.error(err)
      await appDialog.alert(err.response?.data?.message || 'Failed to post comment.')
    } finally {
      setPostingComment(false)
    }
  }

  const filterProject =
    filterProjectId === NO_PROJECT_SECTION
      ? { id: NO_PROJECT_SECTION, title: 'No project' }
      : (isAdmin ? projects : memberProjects).find(p => p.id === filterProjectId)
  const filterDepartment = departments.find(d => d.id === filterDepartmentId)

  const adminAllBoardsView = isAdmin && !filterProjectId
  const adminFocusView = isAdmin && !!filterProjectId
  const memberAllBoardsView = !isAdmin && !filterProjectId
  const memberFocusView = !isAdmin && !!filterProjectId
  const showAllBoardsView = adminAllBoardsView || memberAllBoardsView
  const showFocusView = adminFocusView || memberFocusView
  const projectSections = isAdmin ? adminProjectSections : memberProjectSections

  const statsTasks = adminFocusView
    ? adminFocusSortedTasks
    : memberFocusView
      ? memberFocusSortedTasks
      : isAdmin
        ? adminFilteredTasks
        : memberFilteredTasks

  const progressDone = statsTasks.filter(
    t => t.status === 'Submitted' || isCompletedStatus(t.status)
  ).length
  const progressLabel =
    statsTasks.length === 0
      ? '0/0 (0%)'
      : `${progressDone}/${statsTasks.length} (${Math.round((progressDone / statsTasks.length) * 100)}%)`

  return (
    <DashboardLayout>
      <div>
        <header className="tasks-page-header">
        <div className="tasks-page-header-row">
          <div>
        <h1 className="tasks-page-title">{isAdmin ? 'Tasks' : 'My Tasks'}</h1>
        <p className="tasks-page-sub">
          {isAdmin
            ? 'One board per project: filter, sort, and scroll each table—or open Focus for a single project.'
            : 'Your assignments grouped by project—filter, search, and open a project to focus on one board.'}
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
          </div>
          {isAdmin && adminFocusView && filterProjectId === NO_PROJECT_SECTION ? (
            <button
              type="button"
              className="tasks-page-delete-project"
              onClick={() =>
                clearNoProjectBoard(
                  isAdmin ? adminFocusSortedTasks : memberFocusSortedTasks,
                  'No project'
                )
              }
            >
              Clear board
            </button>
          ) : null}
          {isAdmin && adminFocusView && filterProjectId && filterProjectId !== NO_PROJECT_SECTION && filterProject ? (
            <button
              type="button"
              className="tasks-page-delete-project"
              onClick={() => deleteProjectBoard(filterProjectId, filterProject.title)}
            >
              Delete project
            </button>
          ) : null}
        </div>
        </header>

        {isAdmin && (
          <TasksAdminToolbar
            projects={projects}
            departments={departments}
            members={members}
            projectFilter={adminToolbarProject}
            onProjectFilterChange={setAdminToolbarProject}
            departmentFilter={filterDepartmentId}
            onDepartmentFilterChange={id => {
              const params = new URLSearchParams(searchParams)
              if (id) params.set('department', id)
              else params.delete('department')
              const q = params.toString()
              navigate(q ? `/my-tasks?${q}` : '/my-tasks')
            }}
            statusFilter={adminStatusFilter}
            onStatusFilterChange={setAdminStatusFilter}
            assigneeFilter={adminAssigneeFilter}
            onAssigneeFilterChange={setAdminAssigneeFilter}
            searchQuery={adminSearch}
            onSearchQueryChange={setAdminSearch}
            sortKey={adminSortKey}
            onSortKeyChange={setAdminSortKey}
            onClearFilters={clearAdminFilters}
            filteredTaskCount={adminFilteredTasks.length}
            totalTaskCount={tasks.length}
            viewMode={adminFocusView ? 'focus' : 'cards'}
            onViewModeChange={mode => {
              if (mode === 'cards') navigate('/my-tasks')
            }}
            focusProjectId={filterProjectId}
            onExitFocus={() => navigate('/my-tasks')}
          />
        )}

        {!isAdmin && (
          <TasksMemberToolbar
            projects={memberProjects}
            projectFilter={memberToolbarProject}
            onProjectFilterChange={setMemberToolbarProject}
            statusFilter={memberStatusFilter}
            onStatusFilterChange={setMemberStatusFilter}
            searchQuery={memberSearch}
            onSearchQueryChange={setMemberSearch}
            sortKey={memberSortKey}
            onSortKeyChange={setMemberSortKey}
            onClearFilters={clearMemberFilters}
            filteredTaskCount={memberFilteredTasks.length}
            totalTaskCount={tasks.length}
            viewMode={memberFocusView ? 'focus' : 'cards'}
            onViewModeChange={mode => {
              if (mode === 'cards') navigate('/my-tasks')
            }}
            focusProjectId={filterProjectId}
            onExitFocus={() => navigate('/my-tasks')}
          />
        )}

        {(showAllBoardsView || showFocusView) && (
        <>
        {!isAdmin && (
          <div className="tasks-member-hint">
            <strong>How to work on tasks</strong>
            <ul>
              <li>Click a task <strong>title</strong> to open details and reference files.</li>
              <li>Move status from <strong>To Do</strong> → <strong>In Progress</strong> (you cannot go back to To Do).</li>
              <li>When in progress, submit your Google Drive link for PQAD review.</li>
            </ul>
          </div>
        )}

        <div className="tasks-stats-grid">
          <MiniStat label={isAdmin ? 'Total Tasks' : 'My tasks'} value={statsTasks.length} color="#9e1b32" />
          {statsTasks.length > 0 && (
            <MiniStat label="Work progress" value={progressLabel} color="#0d9488" />
          )}
          <MiniStat label="To Do" value={statsTasks.filter(t => t.status === 'To Do' || t.status === 'Planning').length} color="#7a0019" />
          <MiniStat label="In Progress" value={statsTasks.filter(t => t.status === 'In Progress').length} color="#f59e0b" />
          <MiniStat label="Submitted" value={statsTasks.filter(t => t.status === 'Submitted').length} color="#2563eb" />
          {!isAdmin && (
            <MiniStat label="Returned" value={statsTasks.filter(t => t.status === 'Returned').length} color="#c2410c" />
          )}
          <MiniStat
            label="Completed"
            value={statsTasks.filter(t => isCompletedStatus(t.status)).length}
            color="#16a34a"
          />
        </div>

        {showAllBoardsView ? (
          <div className="tasks-project-boards">
            {projectSections.length === 0 && !loading ? (
              <p style={{ color: '#64748b' }}>
                {isAdmin ? (
                  adminToolbarProject === NO_PROJECT_SECTION ? (
                    'No tasks without a project.'
                  ) : (
                    <>
                      No projects yet.{' '}
                      <Link to="/projects" style={{ color: '#7a0019', fontWeight: 600 }}>
                        Create a project
                      </Link>{' '}
                      to add task boards.
                    </>
                  )
                ) : (
                  'No tasks assigned to you yet.'
                )}
              </p>
            ) : null}
            {projectSections.map(section => (
              <ProjectTaskBoardCard
                key={section.id}
                projectTitle={section.title}
                projectStatus={section.status}
                projectPriority={section.priority}
                tasks={section.tasks}
                subtitle={!isAdmin ? 'Your assignments in this project' : undefined}
                focusLabel={isAdmin ? 'Focus board' : 'Open project'}
                onOpenFocus={() => navigate(`/my-tasks?project=${section.id}`)}
                onCreateTask={
                  isAdmin ? () => openCreateForProject(section.id === NO_PROJECT_SECTION ? '' : section.id) : undefined
                }
                onDeleteProject={
                  isAdmin ? () => deleteProjectBoard(section.id, section.title, section.tasks) : undefined
                }
                deleteProjectLabel={section.id === NO_PROJECT_SECTION ? 'Clear board' : 'Delete project'}
              >
                {renderTaskBoard(
                  section.tasks,
                  section.id !== NO_PROJECT_SECTION ? section.id : ''
                )}
              </ProjectTaskBoardCard>
            ))}
          </div>
        ) : (
          <div className="tasks-board-shell">
            {renderTaskBoard(
              isAdmin ? adminFocusSortedTasks : memberFocusSortedTasks,
              filterProjectId
            )}
          </div>
        )}
        </>
        )}

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

              {(selectedTask.description ||
                taskReferenceDownloads(selectedTask).length > 0 ||
                selectedTask.uploadGoogleDriveLink) ? (
                <div className="task-work-package">
                  <h3>Work package</h3>
                  {selectedTask.description && (
                    <p style={{ margin: '0 0 0.85rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                      {selectedTask.description}
                    </p>
                  )}
                  {!isAdmin && isTaskAssignee(selectedTask, currentUserId) && (
                    <ol className="task-work-steps">
                      <li>Download each reference file below and edit it on your computer.</li>
                      <li>Upload your finished work to the admin&apos;s Google Drive folder.</li>
                      <li>Set status to <strong>In Progress</strong>, paste your Drive link, and submit for review.</li>
                    </ol>
                  )}
                  {taskReferenceDownloads(selectedTask).length > 0 && (
                    <div className="task-ref-files">
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Files to edit</label>
                      {taskReferenceDownloads(selectedTask).map(f => (
                        <a
                          key={f.url}
                          className="task-ref-download"
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <AppIcon name="file" size={18} />
                          Download {f.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                  {selectedTask.uploadGoogleDriveLink && (
                    <>
                      <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Where to upload finished work</label>
                      <a
                        className="task-gdrive-cta"
                        href={selectedTask.uploadGoogleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Google Drive folder
                      </a>
                    </>
                  )}
                </div>
              ) : selectedTask.description ? (
                <>
                  <label style={labelStyle}>Description</label>
                  <p style={{ margin: '0 0 1rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                    {selectedTask.description}
                  </p>
                </>
              ) : null}

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

              {selectedTask.adminReviewRemark && (isAdmin || isTaskAssignee(selectedTask, currentUserId)) && (
                <>
                  <label style={labelStyle}>Feedback from admin</label>
                  <div
                    style={{
                      margin: '0 0 1rem',
                      padding: '0.85rem 1rem',
                      borderRadius: 8,
                      background: selectedTask.status === 'Returned' ? '#fff7ed' : selectedTask.status === 'Completed' ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${selectedTask.status === 'Returned' ? '#fdba74' : selectedTask.status === 'Completed' ? '#86efac' : '#e2e8f0'}`,
                      color: '#334155',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.92rem'
                    }}
                  >
                    {selectedTask.adminReviewRemark}
                  </div>
                </>
              )}

              {!isAdmin && isTaskAssignee(selectedTask, currentUserId) && (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #93c5fd',
                    borderRadius: 10,
                    padding: '1rem',
                    marginBottom: '1rem',
                    fontSize: '0.92rem',
                    color: '#1e3a5f'
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: 6 }}>Your steps</strong>
                  {(selectedTask.status === 'To Do' || selectedTask.status === 'Planning') && (
                    <p style={{ margin: 0 }}>
                      Change <strong>Status</strong> to <strong>In Progress</strong> when you start. You cannot move back to To Do after that. Download files from the work package, upload to Google Drive, then use <strong>Submit</strong>.
                    </p>
                  )}
                  {selectedTask.status === 'In Progress' && (
                    <p style={{ margin: 0 }}>
                      Status stays <strong>In Progress</strong> until you submit. Use <strong>Submit</strong> on the board or paste your Google Drive link below — you cannot revert to To Do.
                    </p>
                  )}
                  {selectedTask.status === 'Submitted' && (
                    <p style={{ margin: 0 }}>
                      <strong>Submitted</strong> — waiting for admin review. This is not completed yet. You will get a notification when it is approved or returned.
                    </p>
                  )}
                  {selectedTask.status === 'Returned' && (
                    <p style={{ margin: 0 }}>
                      Read <strong>Feedback from admin</strong> above. Set status to <strong>In Progress</strong>, fix your work, then submit again.
                    </p>
                  )}
                  {isCompletedStatus(selectedTask.status) && (
                    <p style={{ margin: 0 }}>This task is completed.</p>
                  )}
                </div>
              )}

              {isTaskAssignee(selectedTask, currentUserId) &&
                !isAdmin &&
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

              {isTaskAssignee(selectedTask, currentUserId) && selectedTask.status === 'In Progress' && (
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
                      style={{ ...primaryBtn, width: '100%', maxWidth: 320, padding: '0.75rem 1.25rem', fontSize: '1rem' }}
                    >
                      {submittingDeliverable ? 'Submitting...' : 'Submit for admin review'}
                    </button>
                  </>
                )}

              {isAdmin && selectedTask.status === 'Submitted' && (
                <>
                  <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                    This task is <strong>submitted for review</strong> — not completed. Send the assignee a personal message; they are notified in-app and by email when you return or approve.
                  </p>
                  <label style={labelStyle}>Message when approving (optional)</label>
                  <textarea
                    style={{ ...inputStyle, width: '100%', minHeight: 80, marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    placeholder={'e.g. Hi, good job finishing your task! I will mark this as complete.'}
                    value={adminCompleteRemark}
                    onChange={e => setAdminCompleteRemark(e.target.value)}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={completeTask}
                      disabled={taskActionLoading}
                      style={{ ...primaryBtn, background: '#16a34a' }}
                    >
                      Approve & mark completed
                    </button>
                  </div>
                  <label style={labelStyle}>Message when returning as incomplete (required)</label>
                  <textarea
                    style={{ ...inputStyle, width: '100%', minHeight: 80, marginBottom: '0.75rem', boxSizing: 'border-box' }}
                    placeholder={'e.g. Hi, your task is lacking these details… I am returning it so you can revise.'}
                    value={adminReturnRemark}
                    onChange={e => setAdminReturnRemark(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={returnTaskToMember}
                    disabled={taskActionLoading || !adminReturnRemark.trim()}
                    style={{ ...primaryBtn, background: '#c2410c', marginBottom: '1rem' }}
                  >
                    Return to assignee (incomplete)
                  </button>
                </>
              )}

              {isAdmin && (
                <>
              <label style={{ ...labelStyle, marginTop: '1.25rem' }}>Internal notes (admin only, not sent to member)</label>
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
                </>
              )}

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

          <label style={labelStyle}>Project (required)</label>
          <select
            required
            style={{ ...selectStyle, marginBottom: '1rem' }}
            value={createForm.projectId}
            onChange={e => setCreateForm({ ...createForm, projectId: e.target.value })}
          >
            <option value="">Select project…</option>
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
    <div className="tasks-stat-card" style={{ borderLeftColor: color }}>
      <div className="tasks-stat-card__label">{label}</div>
      <div className="tasks-stat-card__value" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

const inputStyle = { flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem' }
const selectStyle = { width: '100%', padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: '#9e1b32', color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const labelStyle = { display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }