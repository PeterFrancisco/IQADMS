import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import SettingsAdminAccount from '../components/settings/SettingsAdminAccount'
import SettingsGeneral from '../components/settings/SettingsGeneral'
import SettingsMemberAccount from '../components/settings/SettingsMemberAccount'
import SettingsSupport from '../components/settings/SettingsSupport'
import SettingsStorage from '../components/settings/SettingsStorage'
import '../theme/settings-page.css'

const SECTIONS = [
  { id: 'account', label: 'Account settings' },
  { id: 'general', label: 'General settings' },
  { id: 'storage', label: 'Storage', adminOnly: true },
  { id: 'support', label: 'Support', membersOnly: true }
]

export default function SettingsPage() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('section') || 'account'

  const visibleSections = SECTIONS.filter(s => {
    if (s.adminOnly && !isAdmin) return false
    if (s.membersOnly && isAdmin) return false
    return true
  })

  function setSection(id) {
    const params = { section: id }
    if (id === 'account' && isAdmin) params.tab = searchParams.get('tab') || 'requests'
    setSearchParams(params, { replace: true })
  }

  const activeSection = visibleSections.some(s => s.id === section) ? section : 'account'

  return (
    <DashboardLayout>
      <div className="settings-page">
        <header className="settings-page-header">
          <h1>Settings</h1>
          <p>
            {isAdmin
              ? 'Account management, appearance, storage, and system preferences.'
              : 'Your account, appearance, and support options.'}
          </p>
        </header>

        <nav className="settings-section-nav" aria-label="Settings sections">
          {visibleSections.map(s => (
            <button
              key={s.id}
              type="button"
              className={`settings-section-btn ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {activeSection === 'account' ? (
          isAdmin ? <SettingsAdminAccount /> : <SettingsMemberAccount />
        ) : null}

        {activeSection === 'general' ? <SettingsGeneral /> : null}

        {activeSection === 'storage' && isAdmin ? <SettingsStorage /> : null}

        {activeSection === 'support' && !isAdmin ? <SettingsSupport /> : null}
      </div>
    </DashboardLayout>
  )
}
