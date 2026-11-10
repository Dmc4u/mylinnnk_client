import { useId, useState } from 'react'
import './Form.css'

/**
 * Accessible form building blocks for the account screens.
 * - Every input has a visible <label>; hints and errors are linked with
 *   aria-describedby, and invalid inputs get aria-invalid.
 * - Errors are written in plain language and never contain tokens or passwords.
 */
export function TextField({ label, name, type = 'text', value, onChange, error, hint, autoComplete, inputMode, maxLength, required = true, endAdornment, ...rest }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
      <input
        id={id}
        name={name}
        type={type}
        className="field__input"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      {endAdornment}
      </div>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId}>
          <ErrorIcon />
          {error}
        </p>
      )}
    </div>
  )
}

/** Password input with a show/hide toggle. */
export function PasswordField({ label = 'Password', autoComplete = 'current-password', ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <TextField
        {...props}
        label={label}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        spellCheck={false}
        autoCapitalize="off"
        endAdornment={
          <button
            type="button"
            className="password-field__toggle"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        }
      />
    </div>
  )
}

/**
 * Message banner. tone: 'error' | 'success' | 'info' | 'warn'.
 * Errors use role="alert" so screen readers announce them immediately.
 */
export function FormAlert({ tone = 'error', title, children, id }) {
  if (!children && !title) return null
  return (
    <div id={id} className={`form-alert form-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="form-alert__icon" aria-hidden="true">
        {tone === 'success' ? <CheckIcon /> : tone === 'error' ? <ErrorIcon /> : <InfoIcon />}
      </span>
      <div className="form-alert__body">
        {title && <p className="form-alert__title">{title}</p>}
        {children && <div className="form-alert__text">{children}</div>}
      </div>
    </div>
  )
}

/** Primary submit button with a loading state. */
export function SubmitButton({ busy, busyLabel, children, variant = 'primary', className = '', ...rest }) {
  return (
    <button type="submit" className={`btn btn--${variant} btn--md btn--block ${className}`.trim()} disabled={busy} aria-busy={busy || undefined} {...rest}>
      {busy && <span className="btn__spinner" aria-hidden="true" />}
      <span className="btn__label">{busy ? busyLabel : children}</span>
    </button>
  )
}

/** Plain button in the same style (for actions that aren't form submits). */
export function ActionButton({ busy, busyLabel, children, variant = 'ghost', size = 'md', className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn--${variant} btn--${size} ${className}`.trim()} disabled={busy} aria-busy={busy || undefined} {...rest}>
      {busy && <span className="btn__spinner" aria-hidden="true" />}
      <span className="btn__label">{busy ? busyLabel : children}</span>
    </button>
  )
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="form-icon">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v3.75M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="form-icon">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.75 9.25l2.25 2.25 4.25-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="form-icon">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 8.25v4.25M9 5.75h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
