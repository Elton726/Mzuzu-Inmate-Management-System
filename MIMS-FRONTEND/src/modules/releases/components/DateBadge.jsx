import React from 'react';

/**
 * Date Badge Component
 * Shows color-coded badge based on proximity to release date
 */
export default function DateBadge({ date }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const releaseDate = new Date(date);
  releaseDate.setHours(0, 0, 0, 0);
  const daysUntilRelease = Math.floor((releaseDate - today) / (1000 * 60 * 60 * 24));

  let bgColor, textColor, label;

  if (daysUntilRelease < 0) {
    // Past due
    bgColor = 'bg-malawiRed/10 dark:bg-malawiRed/20';
    textColor = 'text-malawiRed dark:text-red-400';
    label = 'Overdue';
  } else if (daysUntilRelease <= 7) {
    // Within 7 days - warn
    bgColor = 'bg-malawiGold/10 dark:bg-malawiGold/20';
    textColor = 'text-malawiGold dark:text-yellow-400';
    label = `${daysUntilRelease} days`;
  } else {
    // More than 7 days - normal
    bgColor = 'bg-gray-100 dark:bg-gray-800';
    textColor = 'text-gray-800 dark:text-gray-300';
    label = releaseDate.toLocaleDateString();
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}
