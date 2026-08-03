import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatBytes } from '../../utils/csvExport'

export default function SettingsStorage() {
  const [loading, setLoading] = useState(true)
  const [systemStorage, setSystemStorage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStorage()
  }, [])

  async function loadStorage() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/Admin/system-storage')
      setSystemStorage(res.data)
    } catch (err) {
      console.error(err)
      setSystemStorage(null)
      setError(err.response?.status === 403 ? 'Administrator access required.' : 'Failed to load storage stats.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <p className="settings-empty">Loading storage…</p>
  }

  if (error) {
    return <p className="settings-empty">{error}</p>
  }

  if (!systemStorage) {
    return <p className="settings-empty">No storage data available.</p>
  }

  return (
    <section className="settings-storage" aria-label="Server storage overview">
      <div className="settings-card">
        <h3>Storage overview</h3>
        <p className="settings-card-desc">
          Uploaded files, PostgreSQL, and server disk on pqad. Task and profile data in the database are separate from document file storage.
        </p>
        <div className="settings-storage__grid">
          <StorageMetric
            label="Document library"
            value={formatBytes(systemStorage.uploads?.documentsBytes ?? 0)}
            detail={`${systemStorage.uploads?.fileCount ?? 0} files total under Uploads/`}
          />
          <StorageMetric
            label="All IQADMS uploads"
            value={formatBytes(systemStorage.uploads?.totalBytes ?? 0)}
            detail={`Docs ${formatBytes(systemStorage.uploads?.documentsBytes ?? 0)} · Tasks ${formatBytes(systemStorage.uploads?.tasksBytes ?? 0)} · Profiles ${formatBytes(systemStorage.uploads?.profilesBytes ?? 0)}`}
          />
          <StorageMetric
            label="Upload quota"
            value={`${formatBytes(systemStorage.uploads?.totalBytes ?? 0)} / ${formatBytes(systemStorage.uploads?.maxBytes ?? 0)}`}
            detail="Configured limit for uploaded files"
          />
          <StorageMetric
            label="PostgreSQL database"
            value={formatBytes(systemStorage.database?.sizeBytes ?? 0)}
            detail={
              systemStorage.database?.name
                ? `Database: ${systemStorage.database.name}`
                : 'Tasks, users, settings'
            }
          />
          <StorageMetric
            label="Server disk"
            value={`${systemStorage.disk?.usedPercent ?? 0}% used`}
            detail={`${formatBytes(systemStorage.disk?.freeBytes ?? 0)} free of ${formatBytes(systemStorage.disk?.totalBytes ?? 0)}${systemStorage.disk?.mountRoot ? ` (${systemStorage.disk.mountRoot})` : ''}`}
          />
        </div>
        {systemStorage.uploads?.uploadsPath ? (
          <p className="settings-storage__path">
            Uploads folder: <code>{systemStorage.uploads.uploadsPath}</code>
          </p>
        ) : null}
        <button type="button" className="settings-secondary-btn" onClick={loadStorage} style={{ marginTop: '1rem' }}>
          Refresh
        </button>
      </div>
    </section>
  )
}

function StorageMetric({ label, value, detail }) {
  return (
    <div className="settings-storage__metric">
      <span className="settings-storage__metric-label">{label}</span>
      <strong className="settings-storage__metric-value">{value}</strong>
      {detail ? <span className="settings-storage__metric-detail">{detail}</span> : null}
    </div>
  )
}
