import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppDialogProvider } from './components/AppDialogProvider.jsx'
import { AppToastProvider } from './components/AppToastProvider.jsx'
import NotificationToastWatcher from './components/NotificationToastWatcher.jsx'

import './index.css'
import './theme/upshd.css'
import './theme/theme-accents.css'
import './theme/nav-interactions.css'
import './theme/dark-mode.css'
import './theme/mobile.css'
import './theme/icons.css'
import App from './App.jsx'
import { startSessionKeepAlive } from './services/api'
import { isSignedIn } from './utils/authSession'
import { ensureLatestAppShell } from './utils/appBuildCache'
import { applyUserPreferences, loadUserPreferencesFromServer } from './utils/userPreferences'

applyUserPreferences()
ensureLatestAppShell()

if (isSignedIn()) {
  startSessionKeepAlive()
  loadUserPreferencesFromServer()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppToastProvider>
        <AppDialogProvider>
          <NotificationToastWatcher />
          <App />
        </AppDialogProvider>
      </AppToastProvider>
    </BrowserRouter>
  </StrictMode>
)
