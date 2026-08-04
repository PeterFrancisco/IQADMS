import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'
import '../theme/hint-button.css'

const VIEWPORT_MARGIN = 10
const GAP = 8

function computePopoverPosition(anchor, popover, align) {
  if (!anchor || !popover) return null

  const rect = anchor.getBoundingClientRect()
  const width = popover.offsetWidth
  const height = popover.offsetHeight
  const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN

  let left =
    align === 'right'
      ? rect.right - width
      : rect.left + rect.width / 2 - width / 2

  left = Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft))

  let top = rect.bottom + GAP
  let placement = 'below'

  if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
    const above = rect.top - GAP - height
    if (above >= VIEWPORT_MARGIN) {
      top = above
      placement = 'above'
    } else {
      top = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)
    }
  }

  return { top, left, placement }
}

export default function HintButton({
  title,
  children,
  className = '',
  size = 16,
  align = 'center',
  compact = false
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const hintId = useId()

  const updatePosition = () => {
    const next = computePopoverPosition(buttonRef.current, popoverRef.current, align)
    if (next) setPosition(next)
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return undefined
    }

    updatePosition()

    const onScrollOrResize = () => updatePosition()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)

    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return undefined

    function onDoc(e) {
      const target = e.target
      if (
        wrapRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    function onEsc(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc, true)
    }
  }, [open])

  const popover =
    open &&
    createPortal(
      <div
        id={hintId}
        ref={popoverRef}
        className={`hint-popover hint-popover--portal hint-popover--${position?.placement || 'below'}`}
        role="tooltip"
        style={
          position
            ? { top: `${position.top}px`, left: `${position.left}px` }
            : { top: '-9999px', left: '-9999px', visibility: 'hidden' }
        }
      >
        {title ? <strong className="hint-popover__title">{title}</strong> : null}
        <div className="hint-popover__body">{children}</div>
      </div>,
      document.body
    )

  return (
    <>
      <span
        className={`hint-button-wrap ${compact ? 'hint-button-wrap--compact' : ''} ${className}`.trim()}
        ref={wrapRef}
      >
        <button
          ref={buttonRef}
          type="button"
          className="hint-button"
          aria-label={title ? `Help: ${title}` : 'Help'}
          aria-expanded={open}
          aria-controls={hintId}
          onClick={e => {
            e.stopPropagation()
            setOpen(v => !v)
          }}
        >
          <HelpCircle size={size} aria-hidden />
        </button>
      </span>
      {popover}
    </>
  )
}
