import React from 'react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/visitation/visitors', label: 'Visitors' },
  { path: '/visitation/registrations', label: 'Registrations' },
  { path: '/visitation/sessions', label: 'Sessions' },
  { path: '/visitation/charity', label: 'Charity' },
  { path: '/visitation/rules', label: 'Rules' },
  { path: '/visitation/reports', label: 'Reports' },
];

export default function VisitationTabs() {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-semibold transition ${isActive ? 'bg-malawiGreen text-white' : 'bg-white text-malawiBlack border border-gray-200 hover:bg-gray-100 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
