import React from 'react';

export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-malawiRed mx-auto mb-3" />
        <p className="text-gray-600 text-sm">{label}</p>
      </div>
    </div>
  );
}

