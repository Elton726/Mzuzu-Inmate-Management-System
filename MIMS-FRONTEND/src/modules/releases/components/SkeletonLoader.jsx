import React from 'react';

/**
 * Skeleton Loader Component
 * Shows animated skeleton placeholder while loading data
 */
export default function SkeletonLoader({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
