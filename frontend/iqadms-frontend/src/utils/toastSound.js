import { isNotificationsMuted } from './userPreferences'

let audioCtx = null

function getContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

/** Short notification chime via Web Audio (no external asset). */
export function playToastSound(kind = 'info') {
  if (isNotificationsMuted()) return

  const ctx = getContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  const freq = kind === 'error' ? 280 : kind === 'success' ? 660 : kind === 'notification' ? 520 : 440
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, now)
  if (kind === 'notification') {
    osc.frequency.setValueAtTime(freq + 120, now + 0.08)
  }

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.25)
}
