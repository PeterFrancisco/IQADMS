/**
 * Position a fixed dropdown so it stays within the viewport.
 * Flips above the trigger when there is not enough room below.
 */
export function floatingMenuPosition(triggerRect, menuSize = {}, options = {}) {
  const pad = options.padding ?? 8
  const gap = options.gap ?? 4
  const width = menuSize.width ?? 180
  const height = menuSize.height ?? 200

  let left = Math.max(pad, triggerRect.right - width)
  if (left + width > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - width - pad)
  }

  let top = triggerRect.bottom + gap
  if (top + height > window.innerHeight - pad) {
    top = Math.max(pad, triggerRect.top - height - gap)
  }

  return {
    top,
    left,
    maxHeight: Math.max(120, window.innerHeight - pad * 2)
  }
}
