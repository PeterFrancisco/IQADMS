import { PRESENCE_OPTIONS, normalizePresence } from '../config/presence'
import '../theme/presence.css'

export default function PresenceSelector({ value, onChange, disabled = false }) {
  const current = normalizePresence(value)

  return (
    <div className="presence-selector" role="radiogroup" aria-label="Activity status">
      {PRESENCE_OPTIONS.map(option => {
        const selected = current === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={`presence-option ${selected ? 'selected' : ''}`}
            onClick={() => onChange(option.id)}
          >
            <span className="presence-option-dot" style={{ background: option.color }} />
            <span className="presence-option-text">
              <span className="presence-option-label">{option.label}</span>
              <span className="presence-option-hint">{option.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function PresenceBadge({ presence, showLabel = true }) {
  const id = normalizePresence(presence)
  const option = PRESENCE_OPTIONS.find(o => o.id === id) || PRESENCE_OPTIONS[3]
  return (
    <span className="presence-badge" style={{ color: option.color }}>
      <span className="presence-badge-dot" style={{ background: option.color }} />
      {showLabel ? option.label : null}
    </span>
  )
}
