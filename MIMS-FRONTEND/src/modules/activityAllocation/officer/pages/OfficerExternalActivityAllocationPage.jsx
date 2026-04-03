import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import Spinner from '../../../../components/common/Spinner';
import { useToast } from '../../../../contexts/useToast';
import * as officerActivityService from '../services/officerActivityService';

export default function OfficerExternalActivityAllocationPage() {
  const { activityId } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [payload, setPayload] = useState(null);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');

  const load = async (nextSearch = search) => {
    try {
      setLoading(true);
      const res = await officerActivityService.getEligibleExternalActivityInmates(activityId, nextSearch ? { search: nextSearch } : {});
      setPayload(res?.data || null);
      setSelected([]);
    } catch (err) {
      toast.fromError(err, { title: 'External allocation' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const eligibleInmates = payload?.eligible_inmates || [];
  const activity = payload?.activity || null;
  const remainingSlots = payload?.remaining_slots;
  const activeAssignmentsCount = payload?.active_assignments_count ?? 0;

  const allSelected = useMemo(
    () => eligibleInmates.length > 0 && selected.length === eligibleInmates.length,
    [eligibleInmates.length, selected.length]
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
      return;
    }
    setSelected(eligibleInmates.map((item) => item.inmate_id));
  };

  const toggleOne = (inmateId) => {
    setSelected((prev) => (
      prev.includes(inmateId)
        ? prev.filter((id) => id !== inmateId)
        : [...prev, inmateId]
    ));
  };

  const allocateSelected = async () => {
    try {
      if (selected.length === 0) {
        toast.push({ title: 'External allocation', message: 'Select at least one inmate.', variant: 'error' });
        return;
      }
      setAllocating(true);
      const res = await officerActivityService.manualAllocateExternalActivity(activityId, selected);
      toast.push({
        title: 'External allocation',
        message: `${res?.data?.allocated_count || selected.length} inmate(s) allocated successfully.`,
        variant: 'success',
      });
      await load(search);
    } catch (err) {
      toast.fromError(err, { title: 'External allocation' });
    } finally {
      setAllocating(false);
    }
  };

  const allocateAutomatically = async () => {
    try {
      setAllocating(true);
      const res = await officerActivityService.autoAllocateExternalActivity(activityId);
      const count = res?.data?.allocated_count || 0;
      toast.push({
        title: 'External allocation',
        message: count > 0 ? `${count} inmate(s) allocated automatically.` : 'No eligible inmates available.',
        variant: 'success',
      });
      await load(search);
    } catch (err) {
      toast.fromError(err, { title: 'Auto allocation' });
    } finally {
      setAllocating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-malawiGold p-8">
        <div className="max-w-7xl mx-auto">
          <Spinner label="Loading eligible inmates..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">External Activity Allocation</h1>
            <p className="text-sm text-gray-600">
              {activity?.name || `Activity #${activityId}`} {activity?.externalDetails?.organization_name ? `• ${activity.externalDetails.organization_name}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/officer/activities">
              <Button variant="outline">Back to Activities</Button>
            </Link>
          </div>
        </div>

        <Card title="Allocation summary">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Eligible inmates</div>
              <div className="text-lg font-bold">{eligibleInmates.length}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Active assignments</div>
              <div className="text-lg font-bold">{activeAssignmentsCount}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Remaining slots</div>
              <div className="text-lg font-bold">{remainingSlots == null ? 'Unlimited' : remainingSlots}</div>
            </div>
          </div>
        </Card>

        <Card title="Allocate inmates">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="min-w-72">
              <Input
                label="Search inmates"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Prison number or name"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => load(search)}>
                Search
              </Button>
              <Button variant="outline" onClick={allocateAutomatically} loading={allocating}>
                Auto Allocate Eligible
              </Button>
              <Button onClick={allocateSelected} loading={allocating}>
                Allocate Selected
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-700 border-b">
                  <th className="py-2 pr-4">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th className="py-2 pr-4">Inmate</th>
                  <th className="py-2 pr-4">Prison #</th>
                  <th className="py-2 pr-4">Admission</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Case</th>
                </tr>
              </thead>
              <tbody>
                {eligibleInmates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-gray-600">
                      No eligible inmates found for this external activity.
                    </td>
                  </tr>
                ) : (
                  eligibleInmates.map((item) => (
                    <tr key={item.admission_id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.inmate_id)}
                          onChange={() => toggleOne(item.inmate_id)}
                        />
                      </td>
                      <td className="py-2 pr-4">{item.inmate_name}</td>
                      <td className="py-2 pr-4">{item.prison_number}</td>
                      <td className="py-2 pr-4">{item.admission_date}</td>
                      <td className="py-2 pr-4">{item.inmate_type}</td>
                      <td className="py-2 pr-4">{item.case_number}</td>
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
