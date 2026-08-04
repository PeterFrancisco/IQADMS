import { useEffect, useId, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import '../theme/hint-button.css'

export default function HintButton({
  title,
  children,
  className = '',
  size = 18,
  align = 'center'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const hintId = useId()

  useEffect(() => {
    if (!open) return undefined

    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }

    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <span className={`hint-button-wrap ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="hint-button"
        aria-label={title ? `Help: ${title}` : 'Help'}
        aria-expanded={open}
        aria-controls={hintId}
        onClick={() => setOpen(v => !v)}
      >
        <HelpCircle size={size} aria-hidden />
      </button>
      {open && (
        <div
          id={hintId}
          className={`hint-popover ${align === 'right' ? 'hint-popover--align-right' : ''}`.trim()}
          role="tooltip"
        >
          {title ? <strong className="hint-popover__title">{title}</strong> : null}
          <div className="hint-popover__body">{children}</div>
        </div>
      )}
    </span>
  )
}
