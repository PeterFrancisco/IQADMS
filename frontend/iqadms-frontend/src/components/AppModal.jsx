import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import '../theme/app-modal.css'

/**
 * Centered in-app dialog (portaled to document.body).
 * Avoids browser alerts and fixed positioning inside scroll containers.
 */
export default function AppModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  hideHeader = false
}) {
  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = e => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="app-modal-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className={`app-modal-panel app-modal-size-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'app-modal-title' : undefined}
        onMouseDown={e => e.stopPropagation()}
      >
        {!hideHeader && (
          <div className="app-modal-header">
            {title ? (
              <h2 id="app-modal-title" className="app-modal-title">
                {title}
              </h2>
            ) : (
              <span />
            )}
            <button type="button" className="app-modal-close" onClick={onClose} aria-label="Close">
              <X size={20} strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}
        <div className="app-modal-body">{children}</div>
        {footer ? <div className="app-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false
}) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="app-modal-actions">
          <button type="button" className="app-modal-btn app-modal-btn-ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`app-modal-btn ${danger ? 'app-modal-btn-danger' : 'app-modal-btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="app-modal-message">{message}</p>
    </AppModal>
  )
}
