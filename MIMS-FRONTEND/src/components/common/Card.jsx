import React from 'react';

export default function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow p-5 dark:bg-slate-800 dark:border dark:border-slate-700 ${className}`}>
      {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{title}</h2>}
      {children}
    </div>
  );
}

