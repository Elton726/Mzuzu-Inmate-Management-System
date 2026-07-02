import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import Spinner from '../../../../components/common/Spinner';
import { useToast } from '../../../../contexts/useToast';
import * as officerActivityService from '../services/officerActivityService';

export default function InternalActivityAutoAssignPage() {
  const { activityId } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [status, setStatus] = useState(null);
  const [slots, setSlots] = useState('5');

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await officerActivityService.getInternalRotationStatus(activityId);
      setStatus(res?.data || null);
      if (res?.data?.max_participants) {
        setSlots(String(res.data.max_participants));
      }
    } catch (err) {
      toast.fromError(err, { title: 'Rotation status' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const handleAutoAssign = async () => {
    try {
      const numSlots = parseInt(slots, 10);
      if (isNaN(numSlots) || numSlots < 1) {
        toast.push({ title: 'Rotation auto-assign', message: 'Please enter a valid number of slots.', variant: 'error' });
        return;
      }
      setAssigning(true);
      const res = await officerActivityService.autoAssignInternalActivity(activityId, numSlots);
      toast.push({
        title: 'Rotation auto-assign',
        message: res?.data?.message || 'Inmates assigned successfully.',
        variant: 'success',
      });
      // Refresh status after assignment
      const statusRes = await officerActivityService.getInternalRotationStatus(activityId);
      setStatus(statusRes?.data || null);
    } catch (err) {
      toast.fromError(err, { title: 'Rotation auto-assign' });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-malawiGold p-8">
        <div className="max-w-7xl mx-auto">
          <Spinner label="Loading rotation status..." />
        </div>
      </div>
    );
  }

  const activity = status?.activity || null;
  const cycleNumber = status?.cycle_number ?? 1;
  const totalInQueue = status?.total_in_queue ?? 0;
  const servedCount = status?.served_count ?? 0;
  const remainingCount = status?.remaining_count ?? 0;
  const eligibleCount = status?.eligible_inmates_count ?? 0;
  const queue = status?.queue || [];
  const nextUp = status?.next_up || [];

  const servedPercentage = totalInQueue > 0 ? Math.round((servedCount / totalInQueue) * 100) : 0;

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Internal Activity Auto-Assignment</h1>
            <p className="text-sm text-gray-600">
              {activity?.name || `Activity #${activityId}`} • Rotating queue and iterate-by-groups algorithm
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/officer/activities">
              <Button variant="outline">Back to Activities</Button>
            </Link>
          </div>
        </div>

        {/* Dashboard/Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Cycle Progress and Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Cycle Status Card */}
            <Card title={`Rotation Cycle #${cycleNumber}`}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-xs font-semibold text-gray-400 uppercase">Queue Cycle</span>
                    <span className="text-2xl font-black text-gray-800">{cycleNumber}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-xs font-semibold text-gray-400 uppercase">Total in Queue</span>
                    <span className="text-2xl font-black text-gray-800">{totalInQueue}</span>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <span className="block text-xs font-semibold text-green-600 uppercase">Served</span>
                    <span className="text-2xl font-black text-green-700">{servedCount}</span>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <span className="block text-xs font-semibold text-amber-600 uppercase">Remaining</span>
                    <span className="text-2xl font-black text-amber-700">{remainingCount}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                    <span>CYCLE COMPLETION PROGRESS</span>
                    <span>{servedPercentage}%</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div 
                      className="h-full bg-green-500 transition-all duration-500 ease-out"
                      style={{ width: `${servedPercentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 italic">
                    Note: Once the progress reaches 100%, the system automatically moves to the next cycle and rebuilds the queue using all eligible inmates.
                  </p>
                </div>
              </div>
            </Card>

            {/* Auto Assignment Execution Card */}
            <Card title="Run Smart Auto-Assign">
              <div className="flex items-end gap-4 max-w-lg flex-wrap">
                <div className="w-40">
                  <Input
                    label="Inmates to Assign"
                    type="number"
                    min="1"
                    max="100"
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Button 
                    className="w-full justify-center bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded"
                    onClick={handleAutoAssign}
                    loading={assigning}
                  >
                    Assign Rotating Group
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                This action will automatically select the top {slots} unserved inmates in the current cycle queue, assign them to this activity, and close their other assignments.
              </p>
            </Card>

          </div>

          {/* Who's Next List */}
          <div className="space-y-6">
            <Card title="Next in Rotation Line">
              {nextUp.length === 0 ? (
                <div className="text-sm text-gray-500 py-6 text-center italic">
                  All inmates in the queue have been served. Running auto-assign will start a new cycle.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {nextUp.map((inmate, idx) => (
                    <div key={inmate.inmate_id} className="py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900">{inmate.inmate_name}</div>
                          <div className="text-xs text-gray-500">Inmate number: {inmate.prison_number}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-400">Pos. {inmate.queue_position}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

        </div>

        {/* Detailed Rotation Queue Table */}
        <Card title="Rotation Queue Details">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-700 border-b">
                  <th className="py-2 pr-4 font-semibold">Queue Position</th>
                  <th className="py-2 pr-4 font-semibold">Inmate Name</th>
                  <th className="py-2 pr-4 font-semibold">Inmate number</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Served Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-gray-600 text-center italic">
                      No inmates currently in rotation queue.
                    </td>
                  </tr>
                ) : (
                  queue.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="py-3 pr-4 font-semibold text-gray-700">#{entry.queue_position}</td>
                      <td className="py-3 pr-4 text-gray-900">{entry.inmate_name}</td>
                      <td className="py-3 pr-4 text-gray-500 font-mono">{entry.prison_number}</td>
                      <td className="py-3 pr-4">
                        {entry.is_served ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ● Served
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            ○ Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {entry.served_at ? new Date(entry.served_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
