import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import AppModal, { ConfirmDialog } from './AppModal'
import { registerAppDialog } from '../utils/appDialog'

const AppDialogContext = createContext(null)

function PromptDialogBody({
  message,
  label,
  placeholder,
  multiline,
  required,
  value,
  onChange,
  inputRef
}) {
  return (
    <>
      {message ? <p className="app-modal-message">{message}</p> : null}
      <label className="app-modal-field-label">{label || 'Value'}</label>
      {multiline ? (
        <textarea
          ref={inputRef}
          className="app-modal-field app-modal-field-area"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          className="app-modal-field"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
    </>
  )
}

export function AppDialogProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null)
  const [promptState, setPromptState] = useState(null)
  const [promptValue, setPromptValue] = useState('')
  const [alertState, setAlertState] = useState(null)
  const promptInputRef = useRef(null)
  const confirmResolveRef = useRef(null)
  const promptResolveRef = useRef(null)
  const alertResolveRef = useRef(null)

  useEffect(() => {
    if (!promptState) return undefined
    setPromptValue(promptState.defaultValue ?? '')
    const t = window.setTimeout(() => {
      const el = promptInputRef.current
      el?.focus()
      if (el && typeof el.select === 'function') el.select()
    }, 50)
    return () => window.clearTimeout(t)
  }, [promptState])

  const closeConfirm = useCallback((result) => {
    confirmResolveRef.current?.(result)
    confirmResolveRef.current = null
    setConfirmState(null)
  }, [])

  const closePrompt = useCallback((result) => {
    promptResolveRef.current?.(result)
    promptResolveRef.current = null
    setPromptState(null)
    setPromptValue('')
  }, [])

  const closeAlert = useCallback(() => {
    alertResolveRef.current?.()
    alertResolveRef.current = null
    setAlertState(null)
  }, [])

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmState({
        title: options.title ?? 'Confirm',
        message: options.message ?? '',
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        danger: options.danger ?? false
      })
    })
  }, [])

  const prompt = useCallback((options) => {
    return new Promise((resolve) => {
      promptResolveRef.current = resolve
      setPromptState({
        title: options.title ?? 'Enter value',
        message: options.message ?? '',
        label: options.label,
        defaultValue: options.defaultValue ?? '',
        placeholder: options.placeholder ?? '',
        multiline: options.multiline ?? false,
        required: options.required ?? false,
        confirmLabel: options.confirmLabel ?? 'Save',
        cancelLabel: options.cancelLabel ?? 'Cancel'
      })
    })
  }, [])

  const alert = useCallback((options) => {
    const message = typeof options === 'string' ? options : options.message
    const title = typeof options === 'string' ? 'Notice' : (options.title ?? 'Notice')
    return new Promise((resolve) => {
      alertResolveRef.current = resolve
      setAlertState({ title, message: message ?? '' })
    })
  }, [])

  const apiRef = useRef({ confirm, prompt, alert })
  apiRef.current = { confirm, prompt, alert }

  useEffect(() => {
    registerAppDialog({
      confirm: (opts) => apiRef.current.confirm(opts),
      prompt: (opts) => apiRef.current.prompt(opts),
      alert: (opts) => apiRef.current.alert(opts)
    })
    return () => registerAppDialog(null)
  }, [confirm, prompt, alert])

  const submitPrompt = () => {
    if (!promptState) return
    const trimmed = promptValue.trim()
    if (promptState.required && !trimmed) return
    closePrompt(trimmed)
  }

  return (
    <AppDialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}

      <ConfirmDialog
        open={Boolean(confirmState)}
        onClose={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        danger={confirmState?.danger}
      />

      <AppModal
        open={Boolean(promptState)}
        onClose={() => closePrompt(null)}
        title={promptState?.title}
        size="sm"
        footer={
          <div className="app-modal-actions">
            <button
              type="button"
              className="app-modal-btn app-modal-btn-ghost"
              onClick={() => closePrompt(null)}
            >
              {promptState?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              className="app-modal-btn app-modal-btn-primary"
              onClick={submitPrompt}
              disabled={promptState?.required && !promptValue.trim()}
            >
              {promptState?.confirmLabel ?? 'Save'}
            </button>
          </div>
        }
      >
        <PromptDialogBody
          message={promptState?.message}
          label={promptState?.label}
          placeholder={promptState?.placeholder}
          multiline={promptState?.multiline}
          required={promptState?.required}
          value={promptValue}
          onChange={setPromptValue}
          inputRef={promptInputRef}
        />
      </AppModal>

      <AppModal
        open={Boolean(alertState)}
        onClose={closeAlert}
        title={alertState?.title}
        size="sm"
        footer={
          <div className="app-modal-actions">
            <button type="button" className="app-modal-btn app-modal-btn-primary" onClick={closeAlert}>
              OK
            </button>
          </div>
        }
      >
        <p className="app-modal-message" style={{ whiteSpace: 'pre-wrap' }}>
          {alertState?.message}
        </p>
      </AppModal>
    </AppDialogContext.Provider>
  )
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext)
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider')
  }
  return ctx
}
