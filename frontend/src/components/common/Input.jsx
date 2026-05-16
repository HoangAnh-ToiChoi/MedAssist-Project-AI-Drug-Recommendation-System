import React, { forwardRef } from 'react'

// Input field tai su dung voi label va error message
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
          error
            ? 'border-red-400 focus:ring-red-400 bg-red-50'
            : 'border-gray-300 focus:ring-primary focus:border-primary'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
