import { getNotificationVolume, isNotificationsMuted } from './userPreferences'

let audioCtx = null
let primed = false

function getContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

/** Call once after login / first click so later toasts can play (browser autoplay policy). */
export async function unlockAudioContext() {
  const ctx = getContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return false
    }
  }
  primed = ctx.state === 'running'
  return primed
}

export function primeAudioOnInteraction() {
  if (typeof window === 'undefined' || primed) return

  const prime = () => {
    void unlockAudioContext()
  }

  window.addEventListener('pointerdown', prime, { once: true, passive: true })
  window.addEventListener('keydown', prime, { once: true })
}

function scheduleTone(ctx, { frequency, start, duration, peakGain, type = 'sine' }) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.0002), start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

/** Two-tone chime — easier to notice than a single short sine blip. */
export async function playToastSound(kind = 'info') {
  if (isNotificationsMuted()) return

  const ctx = getContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') await ctx.resume()
  } catch {
    return
  }

  const level = getNotificationVolume()
  if (level <= 0) return

  const now = ctx.currentTime
  const peak = 0.55 * level

  if (kind === 'notification') {
    scheduleTone(ctx, { frequency: 784, start: now, duration: 0.14, peakGain: peak, type: 'triangle' })
    scheduleTone(ctx, { frequency: 988, start: now + 0.13, duration: 0.18, peakGain: peak * 0.92, type: 'triangle' })
    scheduleTone(ctx, { frequency: 1175, start: now + 0.28, duration: 0.22, peakGain: peak * 0.85, type: 'sine' })
    return
  }

  if (kind === 'error') {
    scheduleTone(ctx, { frequency: 220, start: now, duration: 0.2, peakGain: peak, type: 'square' })
    scheduleTone(ctx, { frequency: 185, start: now + 0.12, duration: 0.24, peakGain: peak * 0.9, type: 'square' })
    return
  }

  if (kind === 'success') {
    scheduleTone(ctx, { frequency: 523, start: now, duration: 0.12, peakGain: peak, type: 'sine' })
    scheduleTone(ctx, { frequency: 659, start: now + 0.1, duration: 0.16, peakGain: peak * 0.95, type: 'sine' })
    return
  }

  scheduleTone(ctx, { frequency: 440, start: now, duration: 0.16, peakGain: peak * 0.85, type: 'sine' })
}
