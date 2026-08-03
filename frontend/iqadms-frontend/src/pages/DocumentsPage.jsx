import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import DashboardLayout from '../components/DashboardLayout'
import AppIcon from '../components/AppIcon'
import AppModal from '../components/AppModal'
import { useAppDialog } from '../components/AppDialogProvider'
import api from '../services/api'
import { getApiOrigin } from '../utils/apiOrigin'
import { pageTitleStyle } from '../theme/pageStyles'
import '../theme/documents.css'

function folderDepth(path) {
  if (!path) return 0
  return path.split('/').filter(Boolean).length - 1
}

export default function DocumentsPage() {
  const dialog = useAppDialog()
  const [folders, setFolders] = useState([])
  const [storageStats, setStorageStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('General')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createFolderName, setCreateFolderName] = useState('')
  const [createFolderParent, setCreateFolderParent] = useState(null)
  const [folderMenu, setFolderMenu] = useState(null)
  const [fileMenu, setFileMenu] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [viewMode, setViewMode] = useState('library')
  const [trashInfo, setTrashInfo] = useState({ retentionDays: 30, items: [] })
  const menuRef = useRef(null)
  const fileMenuRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const close = e => {
      if (menuRef.current?.contains(e.target)) return
      if (fileMenuRef.current?.contains(e.target)) return
      setFolderMenu(null)
      setFileMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [folderRes, statsRes, trashRes] = await Promise.all([
        api.get('/Submissions/folders'),
        api.get('/Submissions/storage-stats'),
        api.get('/Submissions/trash')
      ])
      setFolders(folderRes.data)
      setStorageStats(statsRes.data)
      setTrashInfo(trashRes.data)
      if (viewMode === 'library' && folderRes.data.length > 0 && !folderRes.data.some(f => f.folderPath === selectedFolder)) {
        setSelectedFolder(folderRes.data[0].folderPath)
      }
    } catch (err) {
      console.error(err)
      setFolders([])
    } finally {
      setLoading(false)
    }
  }

  function openCreateFolder(parentPath) {
    setCreateFolderName('')
    setCreateFolderParent(parentPath ?? null)
    setCreateFolderOpen(true)
  }

  async function uploadFiles(fileList, folderPath) {
    const files = Array.from(fileList || [])
    if (!files.length || !folderPath) return

    setUploading(true)
    setMessage('')
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        form.append('folderPath', folderPath)
        await api.post('/Submissions/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      setMessage(`Uploaded ${files.length} file(s) to "${folderPath}".`)
      await loadData()
      setSelectedFolder(folderPath)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
      setDragOver(false)
    }
  }

  async function submitCreateFolder(e) {
    e.preventDefault()
    if (!createFolderName.trim()) return
    try {
      await api.post('/Submissions/folders', {
        name: createFolderName.trim(),
        parentPath: createFolderParent
      })
      const parent = createFolderParent
      const name = createFolderName.trim()
      const newPath = parent ? `${parent}/${name}` : name
      setCreateFolderOpen(false)
      setCreateFolderName('')
      await loadData()
      setSelectedFolder(newPath)
      setMessage('Folder created.')
    } catch (err) {
      await dialog.alert({
        title: 'Could not create folder',
        message: err.response?.data?.message || 'Could not create folder.'
      })
    }
  }

  async function exportFolderPath(path) {
    try {
      const res = await api.get('/Submissions/folders/export', {
        params: { path },
        responseType: 'blob'
      })
      const blob = new Blob([res.data], { type: 'application/zip' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${path.replace(/\//g, '_')}.zip`
      link.click()
      URL.revokeObjectURL(link.href)
      setFolderMenu(null)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Export failed.')
    }
  }

  async function renameFolderPath(oldPath) {
    setFolderMenu(null)
    const shortName = oldPath.split('/').pop()
    const next = await dialog.prompt({
      title: 'Rename folder',
      label: 'Folder name',
      defaultValue: shortName,
      required: true,
      confirmLabel: 'Rename'
    })
    if (!next || next === shortName) return

    const parts = oldPath.split('/')
    parts[parts.length - 1] = next
    const newPath = parts.join('/')

    try {
      await api.put('/Submissions/folders/rename', { oldPath, newPath })
      if (selectedFolder === oldPath) setSelectedFolder(newPath)
      if (selectedFolder.startsWith(`${oldPath}/`)) {
        setSelectedFolder(selectedFolder.replace(oldPath, newPath))
      }
      await loadData()
      setMessage('Folder renamed.')
    } catch (err) {
      await dialog.alert({
        title: 'Rename failed',
        message: err.response?.data?.message || 'Could not rename folder.'
      })
    }
  }

  function openFolderMenu(path, el) {
    const rect = el.getBoundingClientRect()
    setMenuAnchor({ top: rect.bottom + 4, left: Math.max(8, rect.right - 180) })
    setFolderMenu(path)
    setFileMenu(null)
  }

  function openFileMenu(docId, el) {
    const rect = el.getBoundingClientRect()
    setMenuAnchor({ top: rect.bottom + 4, left: Math.max(8, rect.right - 160) })
    setFileMenu(docId)
    setFolderMenu(null)
  }

  async function moveFileToTrash(id) {
    setFileMenu(null)
    const ok = await dialog.confirm({
      title: 'Move file to trash',
      message: 'This file will be moved to trash and permanently deleted after the retention period.',
      confirmLabel: 'Move to trash',
      danger: true
    })
    if (!ok) return
    try {
      await api.delete(`/Submissions/library/files/${id}`)
      setMessage('File moved to trash.')
      await loadData()
    } catch (err) {
      await dialog.alert({ title: 'Delete failed', message: err.response?.data?.message || 'Could not move file to trash.' })
    }
  }

  async function moveFolderToTrash(path) {
    setFolderMenu(null)
    const ok = await dialog.confirm({
      title: 'Move folder to trash',
      message: `Move folder "${path}" and all files inside it (including subfolders) to trash? Items auto-delete after ${trashInfo.retentionDays || 30} days.`,
      confirmLabel: 'Move to trash',
      danger: true
    })
    if (!ok) return
    try {
      await api.delete('/Submissions/folders', { params: { path } })
      setMessage('Folder moved to trash.')
      if (selectedFolder === path || selectedFolder?.startsWith(`${path}/`)) {
        setSelectedFolder('General')
      }
      await loadData()
    } catch (err) {
      await dialog.alert({ title: 'Delete failed', message: err.response?.data?.message || 'Could not move folder to trash.' })
    }
  }

  async function restoreTrashFile(id) {
    try {
      await api.post(`/Submissions/trash/${id}/restore`)
      setMessage('File restored.')
      await loadData()
    } catch (err) {
      await dialog.alert({ title: 'Restore failed', message: err.response?.data?.message || 'Could not restore file.' })
    }
  }

  async function permanentDeleteTrashFile(id) {
    const ok = await dialog.confirm({
      title: 'Delete permanently',
      message: 'This cannot be undone. The file will be removed from the server.',
      confirmLabel: 'Delete forever',
      danger: true
    })
    if (!ok) return
    try {
      await api.delete(`/Submissions/trash/${id}`)
      setMessage('File permanently deleted.')
      await loadData()
    } catch (err) {
      await dialog.alert({ title: 'Delete failed', message: err.response?.data?.message || 'Could not delete file.' })
    }
  }

  async function restoreTrashFolder(path) {
    try {
      await api.post('/Submissions/trash/folders/restore', null, { params: { path } })
      setMessage('Folder restored.')
      await loadData()
      setViewMode('library')
      setSelectedFolder(path)
    } catch (err) {
      await dialog.alert({ title: 'Restore failed', message: err.response?.data?.message || 'Could not restore folder.' })
    }
  }

  const trashCount = trashInfo.items?.length || 0
  const retentionDays = trashInfo.retentionDays || 30

  function matchesSearch(doc) {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      doc.fileName?.toLowerCase().includes(q) ||
      doc.uploadedBy?.toLowerCase().includes(q) ||
      doc.autoFolderPath?.toLowerCase().includes(q)
    )
  }

  const folderList = folders
    .map(f => ({
      ...f,
      files: (f.files || []).filter(matchesSearch),
      fileCount: (f.files || []).filter(matchesSearch).length
    }))
    .filter(f => f.files.length > 0 || !search.trim())

  const activeFolder = viewMode === 'library' ? folderList.find(f => f.folderPath === selectedFolder) || folderList[0] : null
  const activeFiles = viewMode === 'library' ? activeFolder?.files || [] : []
  const trashItems = (trashInfo.items || []).filter(doc => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      doc.fileName?.toLowerCase().includes(q) ||
      doc.trashedFromFolderPath?.toLowerCase().includes(q) ||
      doc.uploadedBy?.toLowerCase().includes(q)
    )
  })

  const trashFolderPaths = [...new Set(trashItems.map(i => i.trashedFromFolderPath).filter(Boolean))]

  function fileLink(doc) {
    if (doc.downloadUrl) return `${getApiOrigin()}${doc.downloadUrl}`
    return doc.googleDriveLink
  }

  const maxMb = storageStats ? Math.round(storageStats.maxUploadBytes / (1024 * 1024)) : 100
  const createLocationLabel = createFolderParent
    ? `Inside “${createFolderParent}”`
    : 'Top level (no parent folder)'

  return (
    <DashboardLayout>
      <div className="docs-page">
        <h1 style={pageTitleStyle}>Documents</h1>
        <div className="docs-toolbar">
          <input
            className="docs-search"
            placeholder="Search files…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {storageStats && (
            <span className="docs-storage-pill">
              {(storageStats.usedBytes / (1024 ** 3)).toFixed(2)} / {(storageStats.maxBytes / (1024 ** 3)).toFixed(0)} GB · max {maxMb} MB per file
            </span>
          )}
        </div>

        {message && (
          <div className={`docs-toast ${message.toLowerCase().includes('fail') ? 'err' : 'ok'}`}>{message}</div>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="docs-layout">
            <aside className="docs-sidebar">
              <div className="docs-sidebar-head">
                <h2>Folders</h2>
                <button type="button" className="docs-btn-primary" onClick={() => openCreateFolder(null)}>
                  + New folder
                </button>
              </div>
              <button
                type="button"
                className={`docs-sidebar-trash ${viewMode === 'trash' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('trash')
                  setFolderMenu(null)
                }}
              >
                <span>Trash</span>
                <span>{trashCount}</span>
              </button>
              {viewMode === 'library' && selectedFolder && (
                <div style={{ padding: '0.5rem 0.75rem 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Selected: <strong style={{ color: '#334155' }}>{selectedFolder}</strong>
                  {' · '}
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', color: '#9e1b32', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    onClick={() => openCreateFolder(selectedFolder)}
                  >
                    Add subfolder
                  </button>
                </div>
              )}
              <div className="docs-folder-list">
                {viewMode === 'library' ? (
                  folderList.length === 0 ? (
                    <p className="docs-empty">No folders yet. Create one to get started.</p>
                  ) : (
                    folderList.map(f => (
                    <div
                      key={f.folderPath}
                      className={`docs-folder-row ${selectedFolder === f.folderPath ? 'active' : ''}`}
                      style={{ paddingLeft: `${0.35 + folderDepth(f.folderPath) * 0.65}rem` }}
                    >
                      <button type="button" className="docs-folder-btn" onClick={() => {
                        setViewMode('library')
                        setSelectedFolder(f.folderPath)
                      }}>
                        <AppIcon name="folder" size={18} />
                        <span className="docs-folder-label" title={f.folderPath}>
                          {f.folderPath.includes('/') ? f.folderPath.split('/').pop() : f.folderPath}
                        </span>
                        <span className="docs-folder-count">{f.fileCount}</span>
                      </button>
                      <button
                        type="button"
                        className="docs-folder-menu-btn"
                        aria-label="Folder options"
                        onClick={e => openFolderMenu(f.folderPath, e.currentTarget)}
                      >
                        ⋮
                      </button>
                    </div>
                  ))
                  )
                ) : (
                  <p className="docs-empty" style={{ padding: '0.75rem' }}>
                    Trashed folders can be restored from the list on the right when files grouped by original folder.
                  </p>
                )}
              </div>
            </aside>

            <div className="docs-main">
              {viewMode === 'trash' && (
                <div className="docs-trash-banner">
                  <strong>Trash retention:</strong> Items stay here for {retentionDays} days, then are{' '}
                  <strong>permanently deleted automatically</strong>. Restore files or folders before that date.
                </div>
              )}

              {viewMode === 'library' && (
              <div
                className={`docs-dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  uploadFiles(e.dataTransfer.files, selectedFolder || 'General')
                }}
              >
                <p className="docs-dropzone-title">
                  {uploading ? 'Uploading…' : `Drop files into “${selectedFolder || 'General'}”`}
                </p>
                <p className="docs-dropzone-hint">Drag and drop here, or choose files from your computer.</p>
                <button
                  type="button"
                  className="docs-btn-primary"
                  style={{ marginTop: '1rem' }}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={e => uploadFiles(e.target.files, selectedFolder || 'General')}
                />
              </div>
              )}

              <div className="docs-file-grid">
                {viewMode === 'trash' ? (
                  trashItems.length === 0 ? (
                    <div className="docs-empty">Trash is empty.</div>
                  ) : (
                    <>
                      {trashFolderPaths.map(path => (
                        <div key={path} className="docs-file-row" style={{ background: '#fafbfc' }}>
                          <AppIcon name="folder" size={20} />
                          <span className="docs-file-name" style={{ color: '#334155' }}>
                            Folder: {path}
                          </span>
                          <div className="docs-file-row-actions">
                            <button type="button" className="docs-btn-sm primary" onClick={() => restoreTrashFolder(path)}>
                              Restore folder
                            </button>
                          </div>
                        </div>
                      ))}
                      {trashItems.map(doc => (
                        <div key={doc.id} className="docs-file-row">
                          <AppIcon name="file" size={20} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="docs-file-name" style={{ color: '#334155' }}>
                              {doc.fileName}
                            </div>
                            <span className="docs-file-meta">
                              From {doc.trashedFromFolderPath || doc.autoFolderPath} · auto-delete{' '}
                              {doc.purgeAfter ? new Date(doc.purgeAfter).toLocaleDateString() : '—'}
                            </span>
                          </div>
                          <div className="docs-file-row-actions">
                            <button type="button" className="docs-btn-sm primary" onClick={() => restoreTrashFile(doc.id)}>
                              Restore
                            </button>
                            <button type="button" className="docs-btn-sm danger" onClick={() => permanentDeleteTrashFile(doc.id)}>
                              Delete forever
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                ) : activeFiles.length === 0 ? (
                  <div className="docs-empty">No files in this folder yet.</div>
                ) : (
                  activeFiles.map(doc => {
                    const href = fileLink(doc)
                    return (
                      <div key={doc.id} className="docs-file-row">
                        <AppIcon name="file" size={20} />
                        {href ? (
                          <a className="docs-file-name" href={href} target="_blank" rel="noreferrer">
                            {doc.fileName}
                          </a>
                        ) : (
                          <span className="docs-file-name" style={{ color: '#334155' }}>
                            {doc.fileName}
                          </span>
                        )}
                        <span className="docs-file-meta">
                          {doc.uploadedBy} · {new Date(doc.submittedAt).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          className="docs-folder-menu-btn"
                          aria-label="File options"
                          onClick={e => openFileMenu(doc.id, e.currentTarget)}
                        >
                          ⋮
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <AppModal
          open={createFolderOpen}
          onClose={() => setCreateFolderOpen(false)}
          title={createFolderParent ? 'New subfolder' : 'New folder'}
          size="sm"
          footer={
            <div className="app-modal-actions">
              <button type="button" className="app-modal-btn app-modal-btn-ghost" onClick={() => setCreateFolderOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                form="docs-create-folder-form"
                className="app-modal-btn app-modal-btn-primary"
                disabled={!createFolderName.trim()}
              >
                Create
              </button>
            </div>
          }
        >
          <form id="docs-create-folder-form" onSubmit={submitCreateFolder}>
            <p className="app-modal-message" style={{ marginBottom: '1rem' }}>
              Location: {createLocationLabel}
            </p>
            {!createFolderParent && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
                To nest folders, select a parent in the sidebar and use <strong>Add subfolder</strong> or the folder menu.
              </p>
            )}
            <label className="app-modal-field-label" htmlFor="docs-new-folder-name">
              Folder name
            </label>
            <input
              id="docs-new-folder-name"
              autoFocus
              className="app-modal-field"
              value={createFolderName}
              onChange={e => setCreateFolderName(e.target.value)}
              placeholder="e.g. Operational plans"
            />
          </form>
        </AppModal>

        {folderMenu &&
          menuAnchor &&
          createPortal(
            <div ref={menuRef} className="docs-folder-menu" style={{ top: menuAnchor.top, left: menuAnchor.left }}>
              <button
                type="button"
                onClick={() => {
                  openCreateFolder(folderMenu)
                  setFolderMenu(null)
                }}
              >
                New subfolder
              </button>
              <button type="button" onClick={() => exportFolderPath(folderMenu)}>
                Download as ZIP
              </button>
              <button type="button" onClick={() => renameFolderPath(folderMenu)}>
                Rename
              </button>
              <button type="button" className="danger" onClick={() => moveFolderToTrash(folderMenu)}>
                Move to trash
              </button>
            </div>,
            document.body
          )}

        {fileMenu &&
          menuAnchor &&
          createPortal(
            <div ref={fileMenuRef} className="docs-folder-menu" style={{ top: menuAnchor.top, left: menuAnchor.left }}>
              <button type="button" className="danger" onClick={() => moveFileToTrash(fileMenu)}>
                Move to trash
              </button>
            </div>,
            document.body
          )}
      </div>
    </DashboardLayout>
  )
}
