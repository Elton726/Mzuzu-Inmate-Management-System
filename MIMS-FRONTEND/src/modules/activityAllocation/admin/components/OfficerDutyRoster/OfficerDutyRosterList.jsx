import React from 'react';
import StatusBadge from '../../../../../components/common/StatusBadge';
import Button from '../../../../../components/common/Button';

export default function OfficerDutyRosterList({ rosters, onDeactivate, onDelete }) {
  const list = Array.isArray(rosters) ? rosters : [];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Officer</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Week</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Coverage</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Status</th>
              <th className="px-6 py-3 text-right text-gray-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">No rosters found.</td>
              </tr>
            ) : (
              list.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-800 font-semibold">
                    {r?.officer?.name || `Officer #${r.officer_id}`}
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {String(r.duty_week_start).slice(0, 10)} → {String(r.duty_week_end).slice(0, 10)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">Full week</td>
                  <td className="px-6 py-4">
                    <StatusBadge active={!!r.is_active} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => onDeactivate(r.id)}
                        disabled={!r.is_active}
                      >
                        Deactivate
                      </Button>
                      <Button
                        variant="danger"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => onDelete(r.id)}
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
