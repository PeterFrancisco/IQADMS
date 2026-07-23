    import { useEffect, useState } from 'react'
    import DashboardLayout from '../components/DashboardLayout'
    import api from '../services/api'

    export default function ActivitiesPage() {
    const emptyForm = {
        name: '',
        year: new Date().getFullYear(),
        startDate: '',
        deadline: '',
        googleDriveFolderLink: '',
        status: 'Planning',
        description: ''
    }

    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [creating, setCreating] = useState(false)
    const [selectedActivity, setSelectedActivity] = useState(null)
    const [editingActivity, setEditingActivity] = useState(null)

    useEffect(() => {
        loadActivities()
    }, [])

    function openEditModal(activity) {
        setEditForm({
            id: activity.id,
            name: activity.name,
            year: activity.year,
            startDate: activity.startDate,
            deadline: activity.deadline,
            googleDriveFolderLink: activity.googleDriveFolderLink,
            status: activity.status,
            description: activity.description
        })

        setSelectedActivity(null)
        setShowEditModal(true)
    }

    async function loadActivities() {
        try {
        setLoading(true)
        const res = await api.get('/AccreditationActivities')
        setActivities(res.data)
        } catch (err) {
        console.error(err)
        } finally {
        setLoading(false)
        }
    }

    async function createActivity() {
        if (!isFormValid) return

        try {
            setCreating(true)

            let res

            if (editingActivity) {
                res = await api.put(
                    `/AccreditationActivities/${editingActivity.id}`,
                    form
                )

                setActivities(prev =>
                    prev.map(activity =>
                        activity.id === editingActivity.id
                            ? res.data
                            : activity
                    )
                )

                setEditingActivity(null)
            } else {
                res = await api.post('/AccreditationActivities', form)

                setActivities(prev => [res.data, ...prev])
            }

            setForm(emptyForm)
            setShowModal(false)
        } catch (err) {
            console.error(err)

            if (err.response) {
                alert(JSON.stringify(err.response.data, null, 2))
            } else {
                alert(err.message)
            }
        } finally {
            setCreating(false)
        }
    }

    const isFormValid =
        form.name.trim() !== '' &&
        form.year >= 1900 &&
        form.startDate !== '' &&
        form.deadline !== '' &&
        new Date(form.deadline) >= new Date(form.startDate)

    return (
        <DashboardLayout>
        <div>
            <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}
            >
            <h1>Accreditation Activities</h1>

            <button
                onClick={() => {
                    setEditingActivity(null)
                    setForm(emptyForm)
                    setShowModal(true)
                }}
                style={buttonStyle}
            >
                + Create Activity
            </button>
            </div>

            {loading ? (
            <p>Loading...</p>
            ) : (
            <div
                style={{
                background: '#fff',
                borderRadius: 12,
                padding: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,.08)'
                }}
            >
                <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                }}
                >
                <thead>
                    <tr style={{ background: '#eef2ff' }}>
                    <th style={thStyle}>Activity</th>
                    <th style={thStyle}>Year</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Created</th>
                    </tr>
                </thead>

                <tbody>
                    {activities.length === 0 ? (
                        <tr>
                            <td
                                colSpan={4}
                                style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280'
                                }}
                            >
                                No accreditation activities found.
                            </td>
                        </tr>
                    ) : (
                        activities.map(activity => (
                    <tr
                        key={activity.id}
                        onClick={() => setSelectedActivity(activity)}
                        style={{
                            transition: '.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={e =>
                            (e.currentTarget.style.background = '#f8fafc')
                        }
                        onMouseLeave={e =>
                            (e.currentTarget.style.background = 'white')
                        }
                    >
                        <td style={tdStyle}>{activity.name}</td>

                        <td style={tdStyle}>{activity.year}</td>

                        <td style={tdStyle}>
                        <span
                            style={{
                            background:
                                activity.status === 'Ongoing'
                                ? '#16a34a'
                                : activity.status === 'Planning'
                                ? '#2563eb'
                                : activity.status === 'Completed'
                                ? '#9333ea'
                                : '#6b7280',
                            color: '#fff',
                            padding: '.35rem .8rem',
                            borderRadius: 20
                            }}
                        >
                            {activity.status}
                        </span>
                        </td>

                        <td style={tdStyle}>
                        {new Date(activity.createdAt).toLocaleDateString()}
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
                </table>
            </div>
            )}

            {showModal && (
            <div style={overlayStyle}>
                <div style={modalStyle}>
                    <div
                    style={{
                        padding: '28px',
                        overflowY: 'auto',
                        maxHeight: 'calc(90vh - 56px)'
                        }}
                    >
                <div style={{ marginBottom: 24 }}>
                    <h2
                        style={{
                            margin: 0,
                            color: '#1e3a8a',
                            fontSize: '1.8rem',
                        }}
                    >
                        {editingActivity
                            ? 'Edit Accreditation Activity'
                            : 'Create Accreditation Activity'}
                    </h2>

                    <p
                        style={{
                            marginTop: 8,
                            color: '#6b7280'
                        }}
                    >
                        {editingActivity
                            ? 'Update the details of the accreditation activity.'
                            : 'Fill in the details to create a new accreditation activity.'}
                    </p>
                </div>

                <div
                    style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                    }}
                >
                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600'
                            }}
                        >
                            Activity Name
                        </label>

                        <input
                            type="text"
                            required
                            style={inputStyle}
                            value={form.name}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    name: e.target.value
                                })
                            }
                        />
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600'
                            }}
                        >
                            Year
                        </label>

                        <input
                            type="number"
                            min="1900"
                            max="2100"
                            required
                            style={inputStyle}
                            value={form.year}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    year: Number(e.target.value)
                                })
                            }
                        />
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600'
                            }}
                        >
                            Start Date
                        </label>

                        <input
                            type="date"
                            required
                            min="1900-01-01"
                            max="2100-12-31"
                            style={inputStyle}
                            value={form.startDate}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    startDate: e.target.value
                                })
                            }
                        />
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600'
                            }}
                        >
                            Deadline
                        </label>

                        <input
                            type="date"
                            required
                            min="1900-01-01"
                            max="2100-12-31"
                            style={inputStyle}
                            value={form.deadline}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    deadline: e.target.value
                                })
                            }
                        />
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600'
                            }}
                        >
                            Google Drive Folder Link
                        </label>

                        <input
                            type="url"
                            placeholder="https://drive.google.com/drive/folders/..."
                            style={inputStyle}
                            value={form.googleDriveFolderLink}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    googleDriveFolderLink: e.target.value
                                })
                            }
                        />
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600'
                            }}
                        >
                            Status
                        </label>

                        <select
                            style={inputStyle}
                            value={form.status}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    status: e.target.value
                                })
                            }
                        >
                            <option value="Planning">Planning</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                            <option value="Archived">Archived</option>
                        </select>
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600'
                            }}
                        >
                            Description
                        </label>

                        <textarea
                            rows={4}
                            placeholder="Enter a brief description of the accreditation activity..."
                            style={{
                                ...inputStyle,
                                fontFamily: 'inherit'
                            }}
                            value={form.description}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    description: e.target.value
                                })
                            }
                        />
                    </div>

                    <div
                        style={{
                            display:'flex',
                            justifyContent:'flex-end',
                            gap: '12px',
                            marginTop:'24px',
                        }}
                    >
                    <button
                        disabled={creating}
                        onClick={() => setShowModal(false)}
                        style={{
                            padding: '12px 22px',
                            borderRadius: '10px',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={createActivity}
                        disabled={!isFormValid || creating}
                        style={{
                            ...buttonStyle,
                            opacity: !isFormValid || creating ? 0.6 : 1,
                            cursor: !isFormValid || creating ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {creating
                            ? (editingActivity ? 'Saving...' : 'Creating...')
                            : (editingActivity ? 'Save Changes' : 'Create')}
                    </button>

                </div>
            </div>
            </div>
            </div>
            </div>
            )}
        </div>
        {selectedActivity && (
            <div style={overlayStyle}>
                <div
                    style={{
                        ...modalStyle,
                        width: '600px'
                    }}
                >
                    <div
                        style={{
                            padding: '28px',
                            overflowY: 'auto',
                            maxHeight: '80vh'
                        }}
                    >
                        <h2
                            style={{
                                marginTop: 0,
                                color: '#1e3a8a'
                            }}
                        >
                            Activity Details
                        </h2>

                        <InfoRow label="Activity Name" value={selectedActivity.name} />
                        <InfoRow label="Year" value={selectedActivity.year} />
                        <InfoRow label="Status" value={selectedActivity.status} />
                        <InfoRow label="Start Date" value={selectedActivity.startDate} />
                        <InfoRow label="Deadline" value={selectedActivity.deadline} />

                        <InfoRow
                            label="Google Drive"
                            value={selectedActivity.googleDriveFolderLink}
                        />

                        <InfoRow
                            label="Description"
                            value={selectedActivity.description}
                        />

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '24px',
                            }}
                        >
                        
                        <button
                            onClick={() => {
                                setEditingActivity(selectedActivity)

                                setForm({
                                    name: selectedActivity.name,
                                    year: selectedActivity.year,
                                    startDate: selectedActivity.startDate,
                                    deadline: selectedActivity.deadline,
                                    googleDriveFolderLink: selectedActivity.googleDriveFolderLink,
                                    status: selectedActivity.status,
                                    description: selectedActivity.description
                                })

                                setSelectedActivity(null)
                                setShowModal(true)
                            }}
                            style={{
                                background: '#f59e0b',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 22px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}

                        >
                            Edit
                        </button>

                            <button
                                onClick={() => setSelectedActivity(null)}
                                style={buttonStyle}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </DashboardLayout>
    )
    }

    function InfoRow({ label, value }) {
        return (
            <div
                style={{
                    marginBottom: '18px'
                }}
            >
                <div
                    style={{
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '6px'
                    }}
                >
                    {label}
                </div>

                <div
                    style={{
                        background: '#f8fafc',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                    }}
                >
                    {value || '-'}
                </div>
            </div>
        )
    }

    const buttonStyle = {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px 22px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '15px',
    transition: '.2s'
    }

    const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.45)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
    }

    const modalStyle = {
    width: '520px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    background: '#fff',
    borderRadius: '18px',
    boxShadow: '0 25px 50px rgba(0,0,0,.25)',
    display: 'flex',
    flexDirection: 'column'
    }

    const thStyle = {
    textAlign: 'left',
    padding: '1rem',
    borderBottom: '1px solid #ddd'
    }

    const tdStyle = {
    padding: '1rem',
    borderBottom: '1px solid #eee'
    }

    const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    fontSize: '15px',
    outline: 'none',
    transition: '.2s',
    boxSizing: 'border-box'
    }