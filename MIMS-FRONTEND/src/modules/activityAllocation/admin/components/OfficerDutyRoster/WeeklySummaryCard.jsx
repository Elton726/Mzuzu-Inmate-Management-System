import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentOfficer, fetchWeeklySummary } from '../../store/dutyRosterSlice';
import Card from '../../../../../components/common/Card';

const isoDate = (d) => d.toISOString().slice(0, 10);

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function WeeklySummaryCard({ weekStart }) {
  const dispatch = useDispatch();
  const { currentWeekSummary, currentOfficer } = useSelector((s) => s.dutyRoster);

  const computedWeekStart = useMemo(() => weekStart || isoDate(startOfWeekMonday(new Date())), [weekStart]);

  useEffect(() => {
    dispatch(fetchCurrentOfficer());
    dispatch(fetchWeeklySummary(computedWeekStart));
  }, [dispatch, computedWeekStart]);

  const summary = currentWeekSummary;
  const assignment = currentOfficer?.officer ? {
    officer_name: currentOfficer.officer?.name,
    officer_id: currentOfficer.officer_id,
    roster_id: currentOfficer.id,
  } : (summary?.assignment || null);

  return (
    <Card title="Current Week Summary" className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Week:</span>{' '}
          {summary?.week_start || computedWeekStart} → {summary?.week_end || '--'}
        </div>
        <div className="border rounded p-3 bg-white w-full md:w-auto">
          <div className="text-xs uppercase text-gray-500">Officer On Duty</div>
          <div className="font-semibold text-gray-800 text-sm mt-1">
            {assignment?.officer_name || 'Not assigned'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Assigned for the full week (all working hours).</div>
        </div>
      </div>
    </Card>
  );
}
