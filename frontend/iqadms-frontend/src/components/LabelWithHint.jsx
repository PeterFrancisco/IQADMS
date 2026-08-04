import HintButton from './HintButton'

export default function LabelWithHint({ label, hint, hintTitle, children, className = '' }) {
  return (
    <div className={`field-with-hint ${className}`.trim()}>
      <div className="field-with-hint__label-row">
        <label>{label}</label>
        {hint ? (
          <HintButton title={hintTitle || label} align="right" compact size={15}>
            {typeof hint === 'string' ? <p>{hint}</p> : hint}
          </HintButton>
        ) : null}
      </div>
      {children}
    </div>
  )
}
