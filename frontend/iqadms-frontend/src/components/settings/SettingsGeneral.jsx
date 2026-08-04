import { useEffect, useState } from 'react'
import {
  ACCENTS,
  FONT_SIZES,
  THEMES,
  getAccent,
  getFontSize,
  getNotificationVolumePercent,
  getTheme,
  isNotificationsMuted,
  setAccent,
  setFontSize,
  setNotificationVolume,
  setNotificationsMuted,
  setTheme
} from '../../utils/userPreferences'
import { playToastSound, unlockAudioContext } from '../../utils/toastSound'

const THEME_LABELS = {
  original: 'Original (PQAD)',
  light: 'Light',
  dark: 'Night'
}

const ACCENT_LABELS = {
  maroon: 'PQAD Maroon',
  slate: 'Slate',
  ocean: 'Ocean',
  forest: 'Forest'
}

const ACCENT_SWATCHES = {
  maroon: '#7a0019',
  slate: '#334155',
  ocean: '#0f766e',
  forest: '#166534'
}

const FONT_LABELS = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large'
}

export default function SettingsGeneral() {
  const [theme, setThemeState] = useState(getTheme)
  const [accent, setAccentState] = useState(getAccent)
  const [fontSize, setFontSizeState] = useState(getFontSize)
  const [muted, setMuted] = useState(isNotificationsMuted)
  const [volume, setVolumeState] = useState(getNotificationVolumePercent)

  useEffect(() => {
    const sync = () => {
      setThemeState(getTheme())
      setAccentState(getAccent())
      setFontSizeState(getFontSize())
      setMuted(isNotificationsMuted())
      setVolumeState(getNotificationVolumePercent())
    }
    window.addEventListener('iqadms-preferences-changed', sync)
    return () => window.removeEventListener('iqadms-preferences-changed', sync)
  }, [])

  function onTheme(next) {
    setTheme(next)
    setThemeState(next)
  }

  function onAccent(next) {
    setAccent(next)
    setAccentState(next)
  }

  function onFontSize(next) {
    setFontSize(next)
    setFontSizeState(next)
  }

  function onMute(next) {
    setNotificationsMuted(next)
    setMuted(next)
  }

  function onVolume(next) {
    const value = Number(next)
    setNotificationVolume(value)
    setVolumeState(value)
  }

  async function testNotificationSound() {
    await unlockAudioContext()
    void playToastSound('notification')
  }

  return (
    <div className="settings-stack">
      <section className="settings-card">
        <h3>Notification sounds</h3>
        <p className="settings-card-desc">Adjust volume for pop-up notification chimes, or mute them entirely.</p>
        <label className="settings-toggle">
          <input type="checkbox" checked={!muted} onChange={e => onMute(!e.target.checked)} />
          <span>{muted ? 'Muted' : 'Sounds enabled'}</span>
        </label>
        {!muted && (
          <div className="settings-volume-row">
            <label htmlFor="notification-volume">Volume</label>
            <input
              id="notification-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={e => onVolume(e.target.value)}
            />
            <span className="settings-volume-value">{volume}%</span>
            <button type="button" className="settings-option-btn" onClick={testNotificationSound}>
              Test sound
            </button>
          </div>
        )}
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
        <p className="settings-card-desc">Choose light, night, or the original PQAD background.</p>
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

      <section className="settings-card">
        <h3>Color theme</h3>
        <p className="settings-card-desc">Accent colors for buttons, headings, and the sidebar, tuned for light and night modes.</p>
        <div className="settings-accent-row">
          {ACCENTS.map(a => (
            <button
              key={a}
              type="button"
              className={`settings-accent-btn ${accent === a ? 'active' : ''}`}
              onClick={() => onAccent(a)}
            >
              <span className="settings-accent-swatch" style={{ background: ACCENT_SWATCHES[a] }} aria-hidden />
              {ACCENT_LABELS[a]}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
