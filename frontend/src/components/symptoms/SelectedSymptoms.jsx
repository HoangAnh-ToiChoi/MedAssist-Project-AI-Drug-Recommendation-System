import React from 'react';

const SelectedSymptoms = ({ selected = [], onRemove }) => {
  if (selected.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Triệu chứng đã chọn ({selected.length})
      </p>
      <div className="flex flex-wrap gap-2 p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
        {selected.map((symptom) => (
          <span
            key={symptom}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/20 text-teal-400"
          >
            <span>🤢</span>
            <span>{symptom}</span>
            <button 
              type="button"
              onClick={() => onRemove(symptom)} 
              className="w-4 h-4 rounded-full flex items-center justify-center bg-teal-900/40 text-teal-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1 focus:outline-none"
              title={`Xóa ${symptom}`}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default SelectedSymptoms;
