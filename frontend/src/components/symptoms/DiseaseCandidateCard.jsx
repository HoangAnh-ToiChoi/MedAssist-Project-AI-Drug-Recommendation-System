import React from 'react';

const DiseaseCandidateCard = ({ disease }) => {
  const scorePercent = Math.round(Number(disease?.score || 0) * 100);
  const title = disease?.displayName || disease?.canonicalName || disease?.name || 'Bệnh chưa rõ';

  return (
    <div className="glass-card rounded-2xl p-4 border-white/5 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-100">{title}</h3>
          {disease?.canonicalName && disease.canonicalName !== title && (
            <p className="text-xs text-slate-400">
              Tên chuẩn: <span className="font-medium text-slate-300">{disease.canonicalName}</span>
            </p>
          )}
        </div>

        <span className="self-start rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-300">
          {scorePercent}% phù hợp
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        {disease?.code && (
          <span className="rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-slate-300">
            Code: {disease.code}
          </span>
        )}
        {disease?.icd10Code && (
          <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-sky-300">
            ICD-10: {disease.icd10Code}
          </span>
        )}
        {disease?.diseaseTypeCode && (
          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
            Chuyên khoa: {disease.diseaseTypeCode}
          </span>
        )}
      </div>
    </div>
  );
};

export default DiseaseCandidateCard;
