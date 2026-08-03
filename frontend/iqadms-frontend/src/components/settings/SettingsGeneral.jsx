import { useState } from 'react'
import {
  FONT_SIZES,
  THEMES,
  getFontSize,
  getTheme,
  isNotificationsMuted,
  setFontSize,
  setNotificationsMuted,
  setTheme
} from '../../utils/userPreferences'

const THEME_LABELS = {
  original: 'Original (PQAD)',
  light: 'Light',
  dark: 'Night'
}

const FONT_LABELS = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large'
}

export default function SettingsGeneral() {
  const [theme, setThemeState] = useState(getTheme)
  const [fontSize, setFontSizeState] = useState(getFontSize)
  const [muted, setMuted] = useState(isNotificationsMuted)

  function onTheme(next) {
    setTheme(next)
    setThemeState(next)
  }

  function onFontSize(next) {
    setFontSize(next)
    setFontSizeState(next)
  }

  function onMute(next) {
    setNotificationsMuted(next)
    setMuted(next)
  }

  return (
    <div className="settings-stack">
      <section className="settings-card">
        <h3>Notification sounds</h3>
        <p className="settings-card-desc">Mute or unmute sounds for pop-up notifications and alerts.</p>
        <label className="settings-toggle">
          <input type="checkbox" checked={!muted} onChange={e => onMute(!e.target.checked)} />
          <span>{muted ? 'Muted' : 'Sounds enabled'}</span>
        </label>
      </section>

      <section className="settings-card">
        <h3>Font size</h3>
        <p className="settings-card-desc">Adjust text size across the app.</p>
        <div className="settings-option-row">
          {FONT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              className={`settings-option-btn ${fontSize === size ? 'active' : ''}`}
              onClick={() => onFontSize(size)}
            >
              {FONT_LABELS[size]}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <h3>Appearance</h3>
        <p className="settings-card-desc">Choose light, night, or the original PQAD theme.</p>
        <div className="settings-option-row">
          {THEMES.map(t => (
            <button
              key={t}
              type="button"
              className={`settings-option-btn ${theme === t ? 'active' : ''}`}
              onClick={() => onTheme(t)}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
