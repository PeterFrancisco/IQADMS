import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import AppIcon from '../components/AppIcon'
import api from '../services/api'
import { getApiOrigin } from '../utils/apiOrigin'
import { upshd } from '../theme/upshd'
import { pageTitleStyle, tableHeadRowStyle, linkStyle } from '../theme/pageStyles'

const STATUS_COLORS = {
  Approved: '#16a34a',
  Submitted: upshd.maroon,
  Pending: '#f59e0b',
  Reviewed: '#9333ea',
  Returned: '#ef4444',
  Rejected: '#ef4444'
}

export default function DocumentsPage() {
  const [folders, setFolders] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [viewMode, setViewMode] = useState('folders')
  const [uploadDept, setUploadDept] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [folderRes, deptRes] = await Promise.all([
        api.get('/Submissions/folders'),
        api.get('/Departments')
      ])
      setFolders(folderRes.data)
      setDepartments(deptRes.data)
      if (folderRes.data.length > 0 && !selectedFolder) {
        setSelectedFolder(folderRes.data[0].folderPath)
      }
    } catch (err) {
      console.error(err)
      setFolders([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!uploadFile || !uploadDept) return

    setUploading(true)
    setUploadMessage('')
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      form.append('departmentId', uploadDept)

      const res = await api.post('/Submissions/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setUploadMessage(res.data.message || 'Upload successful.')
      setUploadFile(null)
      e.target.reset()
      await loadData()
      if (res.data.submission?.autoFolderPath) {
        setSelectedFolder(res.data.submission.autoFolderPath)
        setViewMode('folders')
      }
    } catch (err) {
      setUploadMessage(err.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const allFiles = folders.flatMap(f => f.files || [])
  const filteredFolders = folders
    .map(f => {
      const files = (f.files || []).filter(matchesSearch)
      return { ...f, files, fileCount: files.length }
    })
    .filter(f => f.files.length > 0 || !search)

  function matchesSearch(doc) {
    const q = search.toLowerCase()
    return (
      doc.fileName?.toLowerCase().includes(q) ||
      doc.uploadedBy?.toLowerCase().includes(q) ||
      doc.activity?.toLowerCase().includes(q) ||
      doc.autoFolderPath?.toLowerCase().includes(q) ||
      doc.department?.toLowerCase().includes(q)
    )
  }

  const activeFolder = filteredFolders.find(f => f.folderPath === selectedFolder)
    || filteredFolders[0]

  const flatFiltered = allFiles.filter(matchesSearch)

  function fileLink(doc) {
    if (doc.downloadUrl) {
      return `${getApiOrigin()}${doc.downloadUrl}`
    }
    return doc.googleDriveLink
  }

  return (
    <DashboardLayout>
      <div>
        <h1 style={pageTitleStyle}>Documents</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Files are auto-sorted into folders from the filename (e.g. &quot;Operational Plan 2026&quot; → Operational Plans 2026).
        </p>

        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,.08)',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: upshd.maroon }}>Upload document</h2>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.9rem' }}>
              Department
              <select
                required
                value={uploadDept}
                onChange={e => setUploadDept(e.target.value)}
                style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 220 }}
              >
                <option value="">Select department…</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.9rem' }}>
              File
              <input
                type="file"
                required
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                style={{ fontSize: '0.9rem' }}
              />
            </label>
            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: '0.65rem 1.25rem',
                background: upshd.maroon,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: uploading ? 'wait' : 'pointer'
              }}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
          {uploadMessage && (
            <p style={{ marginTop: '0.75rem', color: uploadMessage.includes('failed') ? '#dc2626' : '#16a34a' }}>
              {uploadMessage}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setViewMode('folders')}
            style={tabStyle(viewMode === 'folders')}
          >
            By folder
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            style={tabStyle(viewMode === 'all')}
          >
            All files
          </button>
        </div>

        <input
          placeholder="Search documents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 400, padding: '0.75rem 1rem',
            borderRadius: 10, border: '1px solid #cbd5e1',
            marginBottom: '1.5rem', fontSize: '0.95rem'
          }}
        />

        {loading ? (
          <p>Loading documents…</p>
        ) : viewMode === 'folders' ? (
          <div className="documents-folder-layout" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <aside style={{
              minWidth: 240,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,.08)',
              padding: '0.75rem 0',
              maxHeight: 520,
              overflowY: 'auto'
            }}>
              {filteredFolders.length === 0 ? (
                <p style={{ padding: '1rem', color: '#94a3b8', margin: 0 }}>No folders yet.</p>
              ) : (
                filteredFolders.map(f => (
                  <button
                    key={f.folderPath}
                    type="button"
                    onClick={() => setSelectedFolder(f.folderPath)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.65rem 1rem',
                      border: 'none',
                      background: selectedFolder === f.folderPath ? '#fef2f2' : 'transparent',
                      borderLeft: selectedFolder === f.folderPath ? `3px solid ${upshd.maroon}` : '3px solid transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <span className="inline-icon-text">
                      <AppIcon name="folder" size={16} />
                      {f.folderPath}
                    </span>
                    <span style={{ color: '#64748b', marginLeft: 6 }}>({f.fileCount})</span>
                  </button>
                ))
              )}
            </aside>

            <div style={{ flex: 1, minWidth: 280 }}>
              {activeFolder ? (
                <>
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem' }} className="inline-icon-text">
                    <AppIcon name="folder" size={20} />
                    {activeFolder.folderPath}
                  </h2>
                  <DocumentTable rows={activeFolder.files.filter(matchesSearch)} fileLink={fileLink} />
                </>
              ) : (
                <p style={{ color: '#94a3b8' }}>Select a folder or upload a file.</p>
              )}
            </div>
          </div>
        ) : (
          <DocumentTable rows={flatFiltered} fileLink={fileLink} showFolder />
        )}
      </div>
    </DashboardLayout>
  )
}

function DocumentTable({ rows, fileLink, showFolder }) {
  return (
    <div className="table-responsive" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={tableHeadRowStyle}>
            <th style={thStyle}>Document</th>
            {showFolder && <th style={thStyle}>Folder</th>}
            <th style={thStyle}>Department</th>
            <th style={thStyle}>Uploaded By</th>
            <th style={thStyle}>Activity</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showFolder ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No documents found.
              </td>
            </tr>
          ) : (
            rows.map(doc => {
              const href = fileLink(doc)
              return (
                <tr key={doc.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" style={linkStyle} className="inline-icon-text">
                        <AppIcon name="file" size={16} />
                        {doc.fileName}
                      </a>
                    ) : (
                      <span className="inline-icon-text">
                        <AppIcon name="file" size={16} />
                        {doc.fileName}
                      </span>
                    )}
                  </td>
                  {showFolder && <td style={tdStyle}>{doc.autoFolderPath || '-'}</td>}
                  <td style={tdStyle}>{doc.department}</td>
                  <td style={tdStyle}>{doc.uploadedBy}</td>
                  <td style={tdStyle}>{doc.activity}</td>
                  <td style={tdStyle}>{new Date(doc.submittedAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: STATUS_COLORS[doc.status] || '#64748b',
                      color: '#fff',
                      padding: '0.3rem 0.75rem',
                      borderRadius: 999,
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      {doc.status}
                    </span>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function tabStyle(active) {
  return {
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: active ? `2px solid ${upshd.maroon}` : '1px solid #cbd5e1',
    background: active ? '#fef2f2' : '#fff',
    fontWeight: 600,
    cursor: 'pointer'
  }
}

const thStyle = { textAlign: 'left', padding: '1rem', borderBottom: '1px solid #ddd', fontWeight: 600 }
const tdStyle = { padding: '1rem', borderBottom: '1px solid #eee' }
