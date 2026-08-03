import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerAppToast } from '../utils/appToast'
import { playToastSound } from '../utils/toastSound'
import '../theme/app-toast.css'

const DEFAULT_DURATION = 3200

function ToastItem({ toast, onDismiss }) {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef(null)

  const dismiss = useCallback(() => {
    setLeaving(true)
    window.setTimeout(() => onDismiss(toast.id), 200)
  }, [onDismiss, toast.id])

  useEffect(() => {
    timerRef.current = window.setTimeout(dismiss, toast.duration ?? DEFAULT_DURATION)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [dismiss, toast.duration])

  const clickable = Boolean(toast.onClick || toast.linkPath)

  function handleClick() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    toast.onClick?.()
    if (toast.linkPath) navigate(toast.linkPath)
    dismiss()
  }

  return (
    <div
      role={clickable ? 'button' : 'status'}
      tabIndex={clickable ? 0 : undefined}
      className={`app-toast ${toast.type || 'info'} ${leaving ? 'leaving' : ''} ${clickable ? 'clickable' : ''}`}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={
        clickable
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
              }
            }
          : undefined
      }
    >
      {toast.title ? <span className="app-toast-title">{toast.title}</span> : null}
      <p className="app-toast-message">{toast.message}</p>
      {clickable ? <span className="app-toast-hint">Click to open</span> : null}
    </div>
  )
}

export function AppToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback(options => {
    const id = `toast-${++idRef.current}`
    const type = options.type || 'info'
    if (!options.silent) playToastSound(type)

    setToasts(prev => [...prev.slice(-4), { ...options, id, type }])
    return id
  }, [])

  useEffect(() => {
    registerAppToast({ show, dismiss })
    return () => registerAppToast(null)
  }, [show, dismiss])

  return (
    <>
      {children}
      {createPortal(
        <div className="app-toast-stack" aria-live="polite" aria-relevant="additions">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
