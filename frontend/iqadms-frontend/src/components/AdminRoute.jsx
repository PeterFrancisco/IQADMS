import { Navigate } from 'react-router-dom'
import { isSignedIn } from '../utils/authSession'

export default function AdminRoute({ children }) {
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  if (!isSignedIn()) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}