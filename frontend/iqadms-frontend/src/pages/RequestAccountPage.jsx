import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { appDialog } from '../utils/appDialog'
import {
  authPageStyle,
  authCardStyle,
  authHeadingStyle,
  authPrimaryButtonStyle,
  authInputStyle
} from '../theme/pageStyles'

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

      await appDialog.alert(
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
        <h1 style={authHeadingStyle}>Request Access</h1>

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

const pageStyle = authPageStyle

const cardStyle = {
  ...authCardStyle,
  maxWidth: '560px'
}

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginBottom: '1rem'
}

const inputStyle = authInputStyle

const buttonStyle = {
  ...authPrimaryButtonStyle,
  width: '100%',
  marginTop: 0
}