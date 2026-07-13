import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  hint,
  left,
  right,
  id,
  type = 'text',
  className = '',
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {left && (
          <span className="absolute left-4 text-muted pointer-events-none flex items-center">
            {left}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={[
            'input-field',
            error ? 'error' : '',
            left ? 'pl-11' : '',
            right ? 'pr-14' : '',
            className,
          ].filter(Boolean).join(' ')}
          {...props}
        />
        {right && (
          <span className="absolute right-4 text-muted pointer-events-none flex items-center">
            {right}
          </span>
        )}
      </div>
      {error && <p className="error-msg">{error}</p>}
      {hint && !error && <p className="text-muted text-sm mt-1">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
