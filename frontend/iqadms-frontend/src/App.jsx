import { Routes, Route, Navigate } from 'react-router-dom'
import MonitoringPage from './pages/MonitoringPage'
import ActivitiesPage from './pages/ActivitiesPage'
import DepartmentsPage from './pages/DepartmentsPage'
import DashboardPage from './pages/DashboardPage'
import DashboardHubPage from './pages/DashboardHubPage'
import LoginPage from './pages/LoginPage'
import RequestAccountPage from './pages/RequestAccountPage'
import ProtectedRoute from './components/ProtectedRoute'
import RegisterPage from './pages/RegisterPage'
import RequestSubmittedPage from './pages/RequestSubmittedPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import AdminAddAccountPage from './pages/AdminAddAccountPage'
import CompleteRegistrationPage from './pages/CompleteRegistrationPage'
import TeamPage from './pages/TeamPage'
import MemberProfilePage from './pages/MemberProfilePage'
import DocumentsPage from './pages/DocumentsPage'
import AdminManageUsersPage from './pages/AdminManageUsersPage'
import AdminRoute from './components/AdminRoute'
import {
  ProjectsPage,
  UpcomingDeadlinesPage,
  RecentActivitiesPage,
  NotificationsPage,
  StatisticsPage,
  CalendarPage,
  ReportsPage
} from './pages/ModulePlaceholders'

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/request-account" element={<RequestAccountPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
      <Route path="/request-access" element={<RequestAccountPage />} />
      <Route path="/request-submitted" element={<RequestSubmittedPage />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
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
        path="/statistics"
        element={
          <ProtectedRoute>
            <StatisticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/monitoring"
        element={
          <ProtectedRoute>
            <MonitoringPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/activities"
        element={
          <ProtectedRoute>
            <ActivitiesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/departments"
        element={
          <ProtectedRoute>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <AdminRoute>
            <SettingsPage />
          </AdminRoute>
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
        path="/team"
        element={
          <ProtectedRoute>
            <TeamPage />
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
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/add-account"
        element={
          <AdminRoute>
            <AdminAddAccountPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/manage-users"
        element={
          <AdminRoute>
            <AdminManageUsersPage />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
