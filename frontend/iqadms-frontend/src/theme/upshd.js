/** Prefer CSS variables in styles — they follow theme/accent settings. */
export const upshd = {
  maroon: 'var(--upshd-maroon)',
  maroonDark: 'var(--upshd-maroon-dark)',
  maroonLight: 'var(--upshd-maroon-light)',
  maroonMuted: 'var(--upshd-maroon-muted)',
  gold: 'var(--upshd-gold)',
  heroGradient: 'var(--upshd-hero-gradient)',
  linkBg: 'var(--upshd-maroon-muted)',
  tableHeadBg: 'var(--upshd-maroon-muted)',
  shadowMaroon: '0 2px 6px rgba(0, 0, 0, 0.12)'
}

/** @deprecated static hex — use upshd.* CSS var strings or pageStyles instead */
export const upshdStatic = {
  maroon: '#7a0019',
  maroonDark: '#5c0012',
  maroonLight: '#9e1b32',
  maroonMuted: '#f3e8eb',
  gold: '#c5a572'
}
