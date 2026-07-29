import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppDialogProvider } from './components/AppDialogProvider.jsx'

import './index.css'
import './theme/upshd.css'
import './theme/mobile.css'
import './theme/icons.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppDialogProvider>
        <App />
      </AppDialogProvider>
    </BrowserRouter>
  </StrictMode>
)