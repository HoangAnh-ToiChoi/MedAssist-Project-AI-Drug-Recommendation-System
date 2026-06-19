import React from 'react';

const MedicalAlert = ({ type = 'info', children, title, className = '' }) => {
  const styles = {
    info: {
      bg: 'bg-sky-500/5',
      border: 'border-sky-500/20',
      text: 'text-sky-400',
      icon: 'ℹ️',
    },
    warning: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      icon: '⚠️',
    },
    danger: {
      bg: 'bg-rose-500/5',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      icon: '🚨',
    },
    success: {
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      icon: '✅',
    },
  };

  const current = styles[type] || styles.info;

  return (
    <div className={`border p-4 rounded-xl flex gap-3 items-start leading-relaxed text-sm ${current.bg} ${current.border} ${className}`}>
      <span className="text-lg leading-none" role="img" aria-label={type}>
        {current.icon}
      </span>
      <div className="flex-grow">
        {title && <h4 className={`font-bold mb-1 ${current.text}`}>{title}</h4>}
        <div className="text-slate-300 text-xs md:text-sm">{children}</div>
      </div>
    </div>
  );
};

export default MedicalAlert;
