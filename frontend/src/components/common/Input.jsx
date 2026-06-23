import React, { forwardRef } from 'react'

// Input field tai su dung voi label va error message (Dark Medical Theme)
const Input = forwardRef(({
  label,
  error,
  hint,
  type = 'text',
  placeholder,
  required = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        className={`w-full bg-slate-950/40 border rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-transparent ${
          error
            ? 'border-rose-500/50 focus:ring-rose-500/40 bg-rose-500/5'
            : 'border-slate-800 focus:ring-teal-500/40'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-rose-400 font-semibold">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
