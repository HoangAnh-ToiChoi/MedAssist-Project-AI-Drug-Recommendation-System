import React from 'react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ title, description, to, icon, status, accentColor = 'teal' }) => {
  const accentStyles = {
    teal: {
      border: 'hover:border-teal-500/30',
      iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      text: 'group-hover:text-teal-400',
      glow: 'from-teal-500/10',
    },
    sky: {
      border: 'hover:border-sky-500/30',
      iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      text: 'group-hover:text-sky-400',
      glow: 'from-sky-500/10',
    },
    amber: {
      border: 'hover:border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      text: 'group-hover:text-amber-400',
      glow: 'from-amber-500/10',
    },
  };

  const styles = accentStyles[accentColor] || accentStyles.teal;

  return (
    <Link 
      to={to} 
      className={`group glass-card p-6 rounded-2xl border-white/5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] hover:-translate-y-1 ${styles.border}`}
    >
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform ${styles.glow}`}></div>
      
      <div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl mb-5 transition-transform group-hover:scale-105 ${styles.iconBg}`}>
          {icon}
        </div>
        <h3 className={`font-bold text-lg text-white mb-2 transition-colors ${styles.text}`}>
          {title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          {description}
        </p>
      </div>

      <div className="flex justify-between items-center pt-2">
        {status && <span className="text-[11px] text-slate-500 font-medium">{status}</span>}
        <span className={`text-xs font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform ${styles.text.replace('group-hover:', '')}`}>
          Quản lý &rarr;
        </span>
      </div>
    </Link>
  );
};

export default FeatureCard;
