import { Navigate } from 'react-router-dom'

import { isSignedIn } from '../utils/authSession'

export default function ProtectedRoute({ children }) {
  if (!isSignedIn()) {
    return <Navigate to="/login" replace />
  }

  return children
}