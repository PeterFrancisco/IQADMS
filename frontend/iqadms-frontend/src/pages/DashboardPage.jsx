import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import { upshd } from '../theme/upshd'

const API_ORIGIN = api.defaults.baseURL.replace(/\/api$/, '')

const STATUS_OPTIONS = ['Planning', 'In Progress', 'Review', 'Done']
const STATUS_COLORS = {
  Planning: '#7a0019',
  'In Progress': '#f59e0b',
  Review: '#9333ea',
  Done: '#16a34a'
}

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    assignedToUserId: '',
    uploadGoogleDriveLink: '',
    attachment: null
  })
  const [selectedTask, setSelectedTask] = useState(null)
  const [deliverableLink, setDeliverableLink] = useState('')
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false)
  const [customColumns, setCustomColumns] = useState([])
  const [cellValues, setCellValues] = useState({})
  const [showAddColumnModal, setShowAddColumnModal] = useState(false)
  const [newColumnForm, setNewColumnForm] = useState({ name: '', columnType: 'text', optionsText: '' })

  const currentUserId = localStorage.getItem('userId')
  const totalCols = 4 + customColumns.length

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [tasksRes, membersRes, columnsRes, valuesRes] = await Promise.all([
        api.get('/Tasks'),
        api.get('/Profile/members'),
        api.get('/BoardColumns'),
        api.get('/BoardColumns/cell-values')
      ])
      setTasks(tasksRes.data)
      setMembers(membersRes.data)
      setCustomColumns(columnsRes.data)

      const map = {}
      valuesRes.data.forEach(cv => {
        map[`${cv.taskId}_${cv.columnId}`] = cv.value ?? ''
      })
      setCellValues(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createTaskWithDetails = async () => {
    if (!createForm.title.trim() || saving) return

    try {
      setSaving(true)

      const res = await api.post('/Tasks', {
        title: createForm.title.trim(),
        assignedToUserId: createForm.assignedToUserId || null,
          uploadGoogleDriveLink: createForm.uploadGoogleDriveLink || null
      })

      if (createForm.attachment) {
        const formData = new FormData()
        formData.append('file', createForm.attachment)
        await api.post(`/Tasks/${res.data.id}/attachment`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      setCreateForm({
        title: '',
        assignedToUserId: '',
        uploadGoogleDriveLink: '',
        attachment: null
      })
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.response?.statusText || 'Failed to create task.')
    } finally {
      setSaving(false)
    }
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

  const deleteColumn = async (columnId, columnName) => {
    const ok = window.confirm(`Delete column "${columnName}"? This cannot be undone.`)
    if (!ok) return

    try {
      await api.delete(`/BoardColumns/${columnId}`)
      loadData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to delete column.')
    }
  }
  
  const createColumn = async () => {
    if (!newColumnForm.name.trim()) return

    try {
      const payload = {
        name: newColumnForm.name.trim(),
        columnType: newColumnForm.columnType
      }
      if (newColumnForm.columnType === 'dropdown') {
        payload.options = newColumnForm.optionsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      }

      await api.post('/BoardColumns', payload)

      setNewColumnForm({ name: '', columnType: 'text', optionsText: '' })
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
      alert('Failed to update status.')
    }
  }

  const openTaskDetail = (task) => {
    setSelectedTask(task)
    setDeliverableLink(task.deliverableGoogleDriveLink || '')
  }

  const closeTaskDetail = () => {
    setSelectedTask(null)
    setDeliverableLink('')
  }

  const submitDeliverable = async () => {
    if (!selectedTask || !deliverableLink.trim() || submittingDeliverable) return

    try {
      setSubmittingDeliverable(true)
      await api.put(`/Tasks/${selectedTask.id}/deliverable`, {
        deliverableGoogleDriveLink: deliverableLink.trim()
      })
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

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ marginBottom: '.25rem', color: '#7a0019' }}>My Tasks</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Your workspace — manage tasks, assignments, and progress
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <MiniStat label="Total Tasks" value={tasks.length} color="#9e1b32" />
          <MiniStat label="In Progress" value={tasks.filter(t => t.status === 'In Progress').length} color="#f59e0b" />
          <MiniStat label="Review" value={tasks.filter(t => t.status === 'Review').length} color="#9333ea" />
          <MiniStat label="Done" value={tasks.filter(t => t.status === 'Done').length} color="#16a34a" />
        </div>

        {loading ? (
          <p>Loading tasks...</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: upshd.tableHeadBg }}>
                  <th style={{ ...thStyle, width: 60 }}></th>
                  <th style={thStyle}>Task</th>
                  <th style={{ ...thStyle, width: 220 }}>Assigned To</th>
                      <th style={{ ...thStyle, width: 180 }}>Status</th>
                      {customColumns.map(col => (
                        <th key={col.id} style={{ ...thStyle, minWidth: 160 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div>
                              <div>{col.name}</div>
                              {col.columnType && (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400, marginTop: '0.2rem' }}>
                                  {col.columnType}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => deleteColumn(col.id, col.name)}
                              title={`Delete ${col.name}`}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                lineHeight: 1,
                                padding: '0.15rem 0.35rem',
                                borderRadius: 6
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </th>
                      ))}
                      <th style={{ ...thStyle, width: 60 }}>
                        <button
                          onClick={() => setShowAddColumnModal(true)}
                          title="Add column"
                          style={plusBtnStyle}
                        >
                          +
                        </button>
                      </th>
                    </tr>
                  </thead>
              <tbody>
                <tr style={{ background: '#fafbff' }}>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      title="Create task"
                      style={plusBtnStyle}
                    >
                      +
                    </button>
                  </td>
                  <td colSpan={totalCols - 1} style={tdStyle}>
                    <span
                      style={{ color: '#94a3b8', cursor: 'pointer' }}
                      onClick={() => setShowCreateModal(true)}
                    >
                      Click + to create a new task
                    </span>
                  </td>
                </tr>

                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No tasks yet. Click + to create one.
                    </td>
                  </tr>
                ) : (
                  tasks.map(task => (
                    <tr key={task.id}>
                      <td style={tdStyle}></td>
                      <td
                        style={{ ...tdStyle, fontWeight: 600, cursor: 'pointer', color: '#7a0019' }}
                        onClick={() => openTaskDetail(task)}
                        title="View task details"
                      >     
                        {task.title}
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={task.assignedToUserId || ''}
                          onChange={e => assignMember(task.id, e.target.value || null)}
                          style={selectStyle}
                        >
                          <option value="">Unassigned</option>
                          {members.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.displayName || m.username} ({m.email})
                            </option>
                          ))}
                        </select>
                        {task.assignedToName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                            <Avatar initials={getInitials(task.assignedToName)} size={28} />
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              {task.assignedToName}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={task.status}
                          onChange={e => updateStatus(task.id, e.target.value)}
                          style={{
                            ...selectStyle,
                            color: '#fff',
                            background: STATUS_COLORS[task.status],
                            fontWeight: 600,
                            border: 'none'
                          }}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                                  </select>
                                </td>
                                {customColumns.map(col => (
                                  <td key={col.id} style={tdStyle}>
                                    <CustomCell
                                      column={col}
                                      taskId={task.id}
                                      value={getCellValue(task.id, col.id)}
                                      onSave={saveCellValue}
                                   />
                                 </td>
                               ))}
                               <td style={tdStyle}></td>
                             </tr>
                           ))
                         )}
                       </tbody>
            </table>
            {selectedTask && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15,23,42,.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999
              }}>
                <div style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '1.5rem',
                  width: '100%',
                  maxWidth: 520,
                  boxShadow: '0 25px 50px rgba(0,0,0,.25)'
                }}>
                  <h2 style={{ margin: '0 0 .5rem', color: '#7a0019' }}>{selectedTask.title}</h2>
                  <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                    Status: <strong style={{ color: STATUS_COLORS[selectedTask.status] }}>{selectedTask.status}</strong>
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
                          href={`${API_ORIGIN}${selectedTask.attachmentDownloadUrl}`}
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

                  {selectedTask.deliverableGoogleDriveLink && selectedTask.status === 'Done' && (
                    <>
                      <label style={labelStyle}>Submitted work</label>
                      <p style={{ margin: '0 0 1rem' }}>
                        <a
                          href={selectedTask.deliverableGoogleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#16a34a', wordBreak: 'break-all' }}
                        >
                          View finished work on Google Drive
                        </a>
                      </p>
                    </>
                  )}

                  {(selectedTask.assignedToUserId === currentUserId ||
                      selectedTask.createdByUserId === currentUserId) &&
                      selectedTask.status !== 'Done' && (
                      <>
                        <label style={labelStyle}>Your finished work (Google Drive link)</label>
                      <input
                        style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
                        placeholder="https://drive.google.com/..."
                        value={deliverableLink}
                        onChange={e => setDeliverableLink(e.target.value)}
                      />
                      <button
                        onClick={submitDeliverable}
                        disabled={submittingDeliverable || !deliverableLink.trim()}
            style={primaryBtn}
          >
            {submittingDeliverable ? 'Submitting...' : 'Submit & Mark Done'}
          </button>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button onClick={closeTaskDetail} style={ghostBtn}>
          Close
        </button>
      </div>
    </div>
  </div>
)}

            {showAddColumnModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15,23,42,.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999
              }}>
                <div style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '1.5rem',
                  width: '100%',
                  maxWidth: 420,
                  boxShadow: '0 25px 50px rgba(0,0,0,.25)'
                }}>
                  <h2 style={{ margin: '0 0 1rem', color: '#7a0019' }}>Add Column</h2>

                  <label style={labelStyle}>Column name</label>
                  <input
                    style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
                    placeholder="e.g. GDrive Submission"
                    value={newColumnForm.name}
                    onChange={e => setNewColumnForm({ ...newColumnForm, name: e.target.value })}
                  />

                  <label style={labelStyle}>Column type</label>
                  <select
                    style={{ ...selectStyle, marginBottom: '1.5rem' }}
                    value={newColumnForm.columnType}
                    onChange={e => setNewColumnForm({ ...newColumnForm, columnType: e.target.value })}
                  >
                    <option value="text">Text</option>
                    <option value="link">Link</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown (limited choices)</option>
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={() => setShowAddColumnModal(false)} style={ghostBtn}>
                      Cancel
                    </button>
                    <button onClick={createColumn} style={primaryBtn}>
                      Add Column
                    </button>
                  </div>
                </div>
              </div>
            )}


            {showCreateModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15,23,42,.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999
              }}>
                <div style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '1.5rem',
                  width: '100%',
                  maxWidth: 480,
                  boxShadow: '0 25px 50px rgba(0,0,0,.25)'
                }}>
                  <h2 style={{ margin: '0 0 1rem', color: '#7a0019' }}>Create Task</h2>

                  <label style={labelStyle}>Task name</label>
                  <input
                    style={{ ...inputStyle, width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
                    placeholder="Enter task name..."
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  />

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
                    style={{ marginBottom: '1.5rem', display: 'block' }}
                    onChange={e => setCreateForm({ ...createForm, attachment: e.target.files[0] })}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                        onClick={() => setShowCreateModal(false)}
                        style={ghostBtn}
                    >
                        Cancel
                    </button>
                    <button
                      onClick={createTaskWithDetails}
                      disabled={saving}
                      style={primaryBtn}
                    >
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function CustomCell({ column, taskId, value, onSave }) {
  const [local, setLocal] = useState(value || '')

  useEffect(() => {
    setLocal(value || '')
  }, [value])

  const commit = () => onSave(taskId, column.id, local)

  if (column.columnType === 'link') {
    return (
      <div>
        <input
          style={selectStyle}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          placeholder="https://..."
        />
        {local && (
          <a
            href={local}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', color: '#9e1b32', display: 'inline-block', marginTop: '0.25rem' }}
          >
            Open
          </a>
        )}
      </div>
    )
  }

  if (column.columnType === 'date') {
    return (
      <input
        type="date"
        style={selectStyle}
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
        style={selectStyle}
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
        style={selectStyle}
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
      style={selectStyle}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      placeholder="..."
    />
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

function Avatar({ initials, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '999px',
      background: '#7a0019', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700
    }}>
      {initials}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '1rem', borderBottom: '1px solid #ddd', fontWeight: 600, color: '#374151' }
const tdStyle = { padding: '1rem', borderBottom: '1px solid #eee', verticalAlign: 'middle' }
const inputStyle = { flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem' }
const selectStyle = { width: '100%', padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }
const plusBtnStyle = { width: 32, height: 32, borderRadius: 8, border: 'none', background: '#9e1b32', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }
const primaryBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: '#9e1b32', color: '#fff', fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }
const labelStyle = { display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }