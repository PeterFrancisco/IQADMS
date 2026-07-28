import './IqadmsLogo.css'

/**
 * @param {{ size?: number; showWordmark?: boolean; wordmarkLayout?: 'stack' | 'inline'; className?: string }} props
 */
export default function IqadmsLogo({
  size = 44,
  showWordmark = true,
  wordmarkLayout = 'stack',
  className = ''
}) {
  return (
    <div
      className={`iqadms-logo iqadms-logo--${wordmarkLayout} ${className}`.trim()}
      aria-label="IQADMS — PQAD UPSHD Molino"
    >
      <img
        className="iqadms-logo-mark"
        src="/logo.svg"
        alt=""
        width={size}
        height={size}
        decoding="async"
      />
      {showWordmark ? (
        <div className="iqadms-logo-text">
          <span className="iqadms-logo-title">IQADMS</span>
          <span className="iqadms-logo-sub">PQAD · UPSHD Molino</span>
        </div>
      ) : null}
    </div>
  )
}
