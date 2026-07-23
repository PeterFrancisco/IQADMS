import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function RequestAccountPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    department: '',
    position: '',
    reason: ''
  })

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
        await api.post('/Auth/request-access', form)

        navigate('/request-submitted')
    } catch (err) {
        console.error(err)

        alert(
            err.response?.data?.message ||
            err.response?.data ||
            err.message ||
            'Failed to submit request.'
        )
        }
    }

  return (
    <div style={pageStyle}>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <h1 style={{ marginTop: 0, color: '#1e3a8a' }}>Request Access</h1>

        <div style={fieldStyle}>
          <label>Full Name</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label>Institutional Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label>Department / Office</label>
          <input name="department" value={form.department} onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label>Position</label>
          <input name="position" value={form.position} onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label>Reason for Access</label>
          <textarea name="reason" value={form.reason} onChange={handleChange} required rows={4} style={inputStyle} />
        </div>

        <button type="submit" style={buttonStyle}>
          Submit Request
        </button>
      </form>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: '#f5f7fb',
  padding: '2rem',
  fontFamily: 'Arial, sans-serif'
}

const cardStyle = {
  width: '100%',
  maxWidth: '560px',
  background: 'white',
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
}

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginBottom: '1rem'
}

const inputStyle = {
  width: '100%',
  padding: '0.85rem',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box'
}

const buttonStyle = {
  width: '100%',
  padding: '0.9rem',
  border: 'none',
  borderRadius: '10px',
  background: '#2563eb',
  color: 'white',
  fontWeight: '700',
  cursor: 'pointer'
}