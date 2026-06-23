import React from 'react'

// Trạng thái trống khi không có dữ liệu (Premium Dark Theme)
const EmptyState = ({ title = 'Không có dữ liệu', description, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center glass-card rounded-2xl border-white/5 p-8 max-w-md mx-auto">
      <div className="w-16 h-16 bg-[#00F0FF]/5 border border-[#00F0FF]/15 rounded-full flex items-center justify-center mb-6">
        {icon || (
          <svg className="w-8 h-8 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      {description && <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-6">{description}</p>}
      {action && <div className="w-full flex justify-center">{action}</div>}
    </div>
  )
}

export default EmptyState
