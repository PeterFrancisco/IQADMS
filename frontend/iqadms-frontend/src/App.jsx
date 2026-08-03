import { Routes, Route, Navigate } from 'react-router-dom'
import AnalyticsPage from './pages/AnalyticsPage'
import DashboardPage from './pages/DashboardPage'
import DashboardHubPage from './pages/DashboardHubPage'
import LoginPage from './pages/LoginPage'
import RequestAccountPage from './pages/RequestAccountPage'
import ProtectedRoute from './components/ProtectedRoute'
import RegisterPage from './pages/RegisterPage'
import RequestSubmittedPage from './pages/RequestSubmittedPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import CompleteRegistrationPage from './pages/CompleteRegistrationPage'
import MemberProfilePage from './pages/MemberProfilePage'
import DocumentsPage from './pages/DocumentsPage'
import ProjectsPage from './pages/ProjectsPage'
import UpcomingDeadlinesPage from './pages/UpcomingDeadlinesPage'
import RecentActivitiesPage from './pages/RecentActivitiesPage'
import NotificationsPage from './pages/NotificationsPage'
import CalendarPage from './pages/CalendarPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import AdminRoute from './components/AdminRoute'
import LandingPage from './pages/LandingPage'
import RefreshToLanding from './components/RefreshToLanding'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

export default function App() {
  return (
    <>
      <RefreshToLanding />
      <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/request-account" element={<RequestAccountPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
      <Route path="/request-access" element={<RequestAccountPage />} />
      <Route path="/request-submitted" element={<RequestSubmittedPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardHubPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-tasks"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <AdminRoute>
            <ProjectsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/upcoming-deadlines"
        element={
          <ProtectedRoute>
            <UpcomingDeadlinesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/recent-activities"
        element={
          <ProtectedRoute>
            <RecentActivitiesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <AdminRoute>
            <AnalyticsPage />
          </AdminRoute>
        }
      />

      <Route path="/statistics" element={<Navigate to="/analytics" replace />} />
      <Route path="/reports" element={<Navigate to="/analytics" replace />} />
      <Route path="/monitoring" element={<Navigate to="/analytics" replace />} />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <AnnouncementsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/requests" element={<Navigate to="/dashboard" replace />} />
      <Route path="/activities" element={<Navigate to="/dashboard" replace />} />
      <Route path="/departments" element={<Navigate to="/dashboard" replace />} />

      <Route path="/report/bug" element={<Navigate to="/settings?section=support" replace />} />
      <Route path="/report/feedback" element={<Navigate to="/settings?section=support" replace />} />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/team/:username"
        element={
          <ProtectedRoute>
            <MemberProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <AdminRoute>
            <DocumentsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/add-account"
        element={<Navigate to="/settings?section=account&tab=add-account" replace />}
      />

      <Route
        path="/admin/manage-users"
        element={<Navigate to="/settings?section=account&tab=manage-users" replace />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
