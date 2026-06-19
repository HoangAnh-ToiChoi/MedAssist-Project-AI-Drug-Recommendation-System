import React from 'react';
import { Link } from 'react-router-dom';

const SafetyChecklist = ({ hasAllergies, hasHistory }) => {
  const isComplete = hasAllergies && hasHistory;

  return (
    <div className="glass-card p-6 rounded-2xl border-teal-500/10 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden">
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          🛡️ Hồ sơ an toàn của bạn
        </h3>
        <p className="text-xs md:text-sm text-slate-400 max-w-xl">
          Để hệ thống trợ lý AI lọc bỏ các nguy cơ tương tác thuốc nguy hiểm, vui lòng đảm bảo bạn đã cập nhật đầy đủ thông tin y khoa cơ bản dưới đây.
        </p>
        
        {/* Checklist statuses */}
        <div className="flex flex-wrap gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10">
            <span>✓</span> Tài khoản đã xác thực
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            hasAllergies 
              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' 
              : 'text-amber-400 bg-amber-500/5 border-amber-500/10'
          }`}>
            <span>{hasAllergies ? '✓' : '⚠️'}</span> 
            {hasAllergies ? 'Đã khai báo dị ứng thuốc' : 'Chưa khai báo dị ứng thuốc'}
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            hasHistory 
              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' 
              : 'text-amber-400 bg-amber-500/5 border-amber-500/10'
          }`}>
            <span>{hasHistory ? '✓' : '⚠️'}</span> 
            {hasHistory ? 'Đã khai báo tiền sử bệnh' : 'Chưa khai báo tiền sử bệnh'}
          </div>
        </div>
      </div>

      {!isComplete && (
        <div className="flex-shrink-0 self-stretch md:self-center bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex flex-col items-start gap-2.5">
          <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
            ⚠️ Hồ sơ chưa hoàn thiện
          </span>
          <p className="text-[11px] text-slate-400 max-w-xs">
            Bạn có thể bỏ lỡ các cảnh báo chống chỉ định nếu bỏ trống dữ liệu bệnh lý hoặc dị ứng.
          </p>
          <Link
            to={!hasAllergies ? '/allergies' : '/medical-history'}
            className="w-full text-center px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors"
          >
            Hoàn thiện hồ sơ ngay
          </Link>
        </div>
      )}
    </div>
  );
};

export default SafetyChecklist;
