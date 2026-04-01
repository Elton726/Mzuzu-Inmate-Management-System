import React from 'react';

export default function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow p-5 ${className}`}>
      {title && <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>}
      {children}
    </div>
  );
}

