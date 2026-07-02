import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../../../../components/common/StatusBadge';
import Button from '../../../../../components/common/Button';

export default function ActivityList({ activities, onToggle, onDelete }) {
  const list = Array.isArray(activities) ? activities : [];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-slate-900 dark:border dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px]">
          <thead className="bg-gray-50 border-b dark:bg-slate-800 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-400 font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-400 font-semibold">Category</th>
              <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-400 font-semibold">Security</th>
              <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-400 font-semibold">Status</th>
              <th className="px-6 py-3 text-right text-gray-700 dark:text-gray-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500 dark:text-gray-400">No activities found.</td>
              </tr>
            ) : (
              list.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50 transition dark:border-slate-700 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200">{a.name}</td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-200">
                    {a.category}
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-200 capitalize">{a.security_level || '--'}</td>
                  <td className="px-6 py-4"><StatusBadge active={!!a.is_active} /></td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/activities/${a.id}/edit`}>
                        <Button variant="outline" className="px-3 py-1.5 text-sm">Edit</Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => onToggle(a.id, a.is_active)}
                      >
                        {a.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="danger"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => onDelete(a)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
