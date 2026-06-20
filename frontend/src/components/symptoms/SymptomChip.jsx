import React from 'react';

const SymptomChip = ({ name, onClick, selected = false, icon = '•' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 active:scale-95 flex items-center gap-1 ${
        selected
          ? 'bg-teal-500/10 border-teal-500/35 text-teal-400 hover:bg-teal-500/20'
          : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
      }`}
    >
      <span>{selected ? '✓' : icon}</span>
      <span>{name}</span>
    </button>
  );
};

export default SymptomChip;
