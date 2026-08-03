import { useEffect, useState } from 'react'
import api from '../services/api'
import DashboardLayout from '../components/DashboardLayout'
import { upshd } from '../theme/upshd'import { appDialog } from '../utils/appDialog'


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
      <DashboardLayout>
        <div style={{ padding: '2rem', color: upshd.maroon, fontWeight: 600 }}>
          Loading monitoring data...
        </div>
      </DashboardLayout>
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              background: 'var(--upshd-surface, #fff)',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(92, 0, 18, 0.06)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Today</div>
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
              type="button"
              style={{
                background: upshd.maroon,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.25rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: upshd.shadowMaroon
              }}
              onMouseEnter={e => (e.currentTarget.style.background = upshd.maroonDark)}
              onMouseLeave={e => (e.currentTarget.style.background = upshd.maroon)}
              onClick={() => void appDialog.alert('Create Activity form coming next')}
            >
              + Create Activity
            </button>
          </div>

          <h1
            style={{
              margin: 0,
              color: upshd.maroon,
              fontSize: '2.2rem',
              fontWeight: '700'
            }}
          >
            Monitoring
          </h1>

          <p
            style={{
              color: '#555',
              marginTop: '0.75rem',
              fontSize: '1.1rem'
            }}
          >
            PACUCOA Accreditation 2026: Submission Monitoring
          </p>
          <p style={{ color: upshd.maroonLight, fontSize: '0.9rem', marginTop: '0.35rem' }}>
            UPSHD Molino Campus · PQAD
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <SummaryCard title="Departments" value={totalDepartments} color={upshd.maroon} />
          <SummaryCard title="Completed" value={completedDepartments} color="#16a34a" />
          <SummaryCard title="Pending" value={pendingDepartments} color="#dc2626" />
          <SummaryCard title="Average Progress" value={`${averageProgress}%`} color={upshd.gold} />
        </div>

        <div
          style={{
            background: 'var(--upshd-surface, #fff)',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 2px 8px rgba(92, 0, 18, 0.06)',
            border: '1px solid #e5e7eb'
          }}
        >
          <h2 style={{ marginTop: 0, color: upshd.maroon }}>Department Progress</h2>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: upshd.tableHeadBg }}>
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
                  style={{ transition: 'background 0.2s', cursor: 'pointer' }}
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
                            item.progressPercentage === 100 ? '#16a34a' : upshd.maroon
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

        <footer
          style={{
            marginTop: '3rem',
            textAlign: 'center',
            color: '#666',
            fontSize: '0.9rem'
          }}
        >
          <p>
            Developed by <strong>Peter Francisco</strong>
          </p>
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
        background: 'var(--upshd-surface, #fff)',
        borderRadius: '12px',
        padding: '1rem',
        boxShadow: '0 2px 8px rgba(92, 0, 18, 0.06)',
        borderLeft: `6px solid ${color}`
      }}
    >
      <div style={{ color: '#555', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem',
  borderBottom: '1px solid #d1d5db',
  color: upshd.maroonDark
}

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid #e5e7eb'
}
