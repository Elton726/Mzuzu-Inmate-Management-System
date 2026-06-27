import React from 'react';

const labelize = (value) => String(value || '')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

function Row({ label, value, hideIfEmpty = true }) {
  const shouldHide = hideIfEmpty && (value === null || value === undefined || value === '');
  if (shouldHide) return null;

  return (
    <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-100">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800 break-words">{value}</div>
    </div>
  );
}

/**
 * Drawer that shows full information for a single visit record.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - record: normal visit session OR charity booking
 */
export default function VisitationHistoryDetailsDrawer({ open, onClose, record, mode }) {
  if (!open || !record) return null;

  const isCharity = mode === 'charity';

  const visitor = !isCharity ? record.visitor : record.session?.visitor;

  const createdDate = !isCharity ? record.created_at : record.created_at;
  const status = !isCharity ? record.status : record.status;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-[min(720px,100vw)] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {isCharity ? 'Charity Visit' : 'Normal Visit'} Details
            </div>
            <div className="text-2xl font-extrabold text-slate-950 mt-1">
              {isCharity ? (record.organisation_name || 'Charity') : (visitor?.full_name || 'Visit')}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              Status: <span className="font-bold">{labelize(status)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
            <Row label="Date" value={createdDate ? new Date(createdDate).toLocaleString() : null} />
            <Row label="Visitor/Organisation" value={isCharity ? record.organisation_name : visitor?.full_name} />
            <Row label="Phone" value={isCharity ? record.contact_person_phone : visitor?.phone} />
            <Row
              label="Group visited"
              value={record.wing || record.cell_block || record.block || record.wing_name || null}
              hideIfEmpty={false}
            />

            {isCharity ? (
              <>
                <Row label="Purpose" value={record.purpose} />
                <Row
                  label="Proposed Date"
                  value={record.proposed_date ? new Date(record.proposed_date).toLocaleDateString() : null}
                />
                <Row label="Proposed Time" value={record.proposed_time} />
                <Row label="Duration (minutes)" value={record.duration_minutes} />
              </>
            ) : (
              <>
                <Row label="Visit Type" value={record.visit_type} />
                <Row label="Checked In" value={record.checked_in_at ? new Date(record.checked_in_at).toLocaleString() : null} />
                <Row label="Checked Out" value={record.checked_out_at ? new Date(record.checked_out_at).toLocaleString() : null} />
                <Row label="Denial Reason" value={record.denial_reason} />
                <Row label="Denial Notes" value={record.denial_notes} />
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="text-sm font-extrabold text-slate-950 mb-2">Items</div>
            {(() => {
              const items = isCharity ? (record.session?.items || []) : (record.items || []);
              if (!items || items.length === 0) {
                return (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-600">
                    No items recorded.
                  </div>
                );
              }

              return (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3 font-bold text-slate-600">Description</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Status</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {it.item_description || it.item_description === '' ? it.item_description : '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{labelize(it.status)}</td>
                            <td className="px-4 py-3 text-slate-600">{it.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

