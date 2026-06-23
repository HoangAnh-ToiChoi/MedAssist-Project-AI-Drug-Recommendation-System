import React from 'react';

const PageHeader = ({ title, description, action }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 self-start md:self-center">
          {action}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
