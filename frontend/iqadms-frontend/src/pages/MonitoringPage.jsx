import { useEffect, useState } from 'react'
import api from '../services/api'
import DashboardLayout from '../components/DashboardLayout'

const ACTIVITY_ID = '93cb5e08-4c2c-40bf-9d79-59d0c2a1d689'

export default function MonitoringPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get(`/Monitoring/activity/${ACTIVITY_ID}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
        <h2>Loading monitoring data...</h2>
      </div>
    )
  }

  const totalDepartments = data.length
  const completedDepartments = data.filter(d => d.isComplete).length
  const pendingDepartments = totalDepartments - completedDepartments
  const averageProgress =
    totalDepartments === 0
      ? 0
      : (
          data.reduce((sum, d) => sum + d.progressPercentage, 0) /
          totalDepartments
        ).toFixed(2)

  return (
    <DashboardLayout>
      <div>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                {/* Top Header Bar */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        background: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <div>
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Today
        </div>
        <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <button
        style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          padding: '0.75rem 1.25rem',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(37,99,235,0.35)'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
        onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
        onClick={() => alert('Create Activity form coming next')}
      >
        + Create Activity
      </button>
    </div>
            <h1
                style={{
                margin: 0,
                color: '#1e3a8a',
                fontSize: '2.2rem',
                fontWeight: '700',
                }}
            >
                IQADMS Dashboard
            </h1>

            <p
                style={{
                    color: '#555',
                    marginTop: '0.75rem',
                    fontSize: '1.1rem'
                }}
            >
                PACUCOA Accreditation 2026 – Submission Monitoring
             </p>
        </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <SummaryCard title="Departments" value={totalDepartments} color="#2563eb" />
        <SummaryCard title="Completed" value={completedDepartments} color="#16a34a" />
        <SummaryCard title="Pending" value={pendingDepartments} color="#dc2626" />
        <SummaryCard title="Average Progress" value={`${averageProgress}%`} color="#9333ea" />
      </div>

      {/* Monitoring Table */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <h2 style={{ marginTop: 0 }}>Department Progress</h2>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}
        >
          <thead>
            <tr style={{ background: '#eef2ff' }}>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Submitted</th>
              <th style={thStyle}>Missing</th>
              <th style={thStyle}>Progress</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>

          <tbody>
            {data.map(item => (
              <tr
                key={item.departmentId}
                style={{
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <td style={tdStyle}>{item.departmentName}</td>

                <td style={tdStyle}>
                  {item.submittedDocuments} / {item.totalRequiredDocuments}
                </td>

                <td style={tdStyle}>{item.missingDocuments}</td>

                <td style={tdStyle}>
                  <div
                    style={{
                      background: '#e5e7eb',
                      borderRadius: '999px',
                      height: '10px',
                      overflow: 'hidden',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div
                      style={{
                        width: `${item.progressPercentage}%`,
                        height: '100%',
                        background:
                          item.progressPercentage === 100
                            ? '#16a34a'
                            : '#2563eb'
                      }}
                    />
                  </div>
                  <small>{item.progressPercentage}%</small>
                </td>

                <td style={tdStyle}>
                  <span
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      color: 'white',
                      background: item.isComplete ? '#16a34a' : '#f59e0b'
                    }}
                  >
                    {item.isComplete ? 'Complete' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
            <footer
        style={{    
          marginTop: '3rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.9rem'
        }}
      >
        <p>Developed by <strong>Peter Francisco</strong></p>
        <p>Contact Support | Report an Issue</p>
      </footer>
    </div>
  </DashboardLayout>
  )
}

function SummaryCard({ title, value, color }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        borderLeft: `6px solid ${color}`
      }}
    >
      <div style={{ color: '#555', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>
        {value}
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem',
  borderBottom: '1px solid #d1d5db'
}

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid #e5e7eb'
}