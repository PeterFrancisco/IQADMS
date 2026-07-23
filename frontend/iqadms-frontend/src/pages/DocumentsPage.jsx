import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

const STATUS_COLORS = {
  Approved: '#16a34a',
  Submitted: '#2563eb',
  Pending: '#f59e0b',
  Reviewed: '#9333ea',
  Returned: '#ef4444',
  Rejected: '#ef4444'
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    try {
      const res = await api.get('/Submissions')
      setDocs(res.data)
    } catch (err) {
      console.error(err)
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = docs.filter(d =>
    d.fileName?.toLowerCase().includes(search.toLowerCase()) ||
    d.uploadedBy?.toLowerCase().includes(search.toLowerCase()) ||
    d.activity?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ marginBottom: '.25rem', color: '#1e3a8a' }}>Documents</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          All uploaded documents across accreditation activities
        </p>

        <input
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 400, padding: '0.75rem 1rem',
            borderRadius: 10, border: '1px solid #cbd5e1',
            marginBottom: '1.5rem', fontSize: '0.95rem'
          }}
        />

        {loading ? (
          <p>Loading documents...</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#eef2ff' }}>
                  <th style={thStyle}>Document</th>
                  <th style={thStyle}>Uploaded By</th>
                  <th style={thStyle}>Activity</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map(doc => (
                    <tr key={doc.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {doc.googleDriveLink ? (
                          <a href={doc.googleDriveLink} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                            📄 {doc.fileName}
                          </a>
                        ) : (
                          <>📄 {doc.fileName}</>
                        )}
                      </td>
                      <td style={tdStyle}>{doc.uploadedBy}</td>
                      <td style={tdStyle}>{doc.activity}</td>
                      <td style={tdStyle}>
                        {new Date(doc.submittedAt).toLocaleDateString()}
                      </td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

const thStyle = { textAlign: 'left', padding: '1rem', borderBottom: '1px solid #ddd', fontWeight: 600 }
const tdStyle = { padding: '1rem', borderBottom: '1px solid #eee' }
