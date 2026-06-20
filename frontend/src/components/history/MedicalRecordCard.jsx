import React from 'react';

const MedicalRecordCard = ({ record, onEdit, onDelete }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">Đang điều trị</span>;
      case 'chronic':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">Mạn tính</span>;
      case 'remission':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">Thuyên giảm</span>;
      default:
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">{status}</span>;
    }
  };

  return (
    <div className="glass-card p-5 rounded-2xl border-white/5 hover:border-teal-500/30 transition-all flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-base text-white leading-tight">
            📋 {record.condition}
          </h3>
          {getStatusBadge(record.status || 'active')}
        </div>
        
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
          📅 Năm chẩn đoán: {record.diagnosedAt ? new Date(record.diagnosedAt).getFullYear() : 'N/A'}
        </p>

        {record.notes && (
          <div className="mt-3 bg-slate-950/20 border border-slate-900 rounded-lg p-2.5">
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Ghi chú</p>
            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-slate-800/40">
        <button 
          onClick={() => onEdit(record)} 
          className="text-teal-400 hover:text-teal-300 text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-teal-500/5 transition-colors focus:outline-none"
        >
          ✏️ Sửa
        </button>
        <button 
          onClick={() => onDelete(record.id)} 
          className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/5 transition-colors focus:outline-none"
        >
          🗑️ Xóa
        </button>
      </div>
    </div>
  );
};

export default MedicalRecordCard;
